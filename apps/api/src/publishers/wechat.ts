/**
 * 微信公众号 Publisher — 全部使用 F12 验证的选择器
 *
 * 选择器来源：公众号后台实际 DOM（2026-05-31）
 */
import { PlatformType } from '@multipost/shared'
import type { PlatformContent } from '@multipost/shared'
import path from 'path'
import os from 'os'
import { BasePublisher, type PublishResult } from './base.js'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const UDD = path.join(os.homedir(), '.multipost', 'chrome-wechat')

// DOM 选择器 — F12 实测
const SEL = {
  newArticle: '#app > div.main_bd_new > div:nth-child(3) > div.weui-desktop-panel__bd > div > div:nth-child(2)',
  title: '#js_title_main > div > div > div > div',
  author: '#author',
  bodyFrame: '#ueditor_0',
  save: '#js_submit > button',
}

export class WeChatPublisher extends BasePublisher {
  readonly platformType = PlatformType.WECHAT_MP

  async publish(content: PlatformContent): Promise<PublishResult> {
    const { chromium } = await import('playwright')
    let browser: any = null

    try {
      browser = await chromium.launchPersistentContext(UDD, {
        headless: false, executablePath: CHROME,
        viewport: { width: 1280, height: 900 },
        args: BasePublisher.CHROME_ARGS,
      })
      let page = browser.pages()[0]

      // 1. 打开后台首页
      await page.goto('https://mp.weixin.qq.com/', { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForTimeout(4000)

      // 2. 登录检测
      if (page.url().includes('login') || page.url().includes('qrconnect')) {
        const ok = await this.waitForLogin(page, ['login', 'qrconnect'], 60)
        if (!ok) return { success: false, platform: PlatformType.WECHAT_MP, message: '登录超时' }
        await page.waitForTimeout(5000)
      }

      // 3. 截图
      await page.screenshot({ path: path.join(os.homedir(), 'Desktop', 'wechat-publish.png') }).catch(() => {})

      // 4. 点击「新建图文」— 公众号会在新标签页打开编辑器
      let inEditor = false
      try {
        const btn = page.locator(SEL.newArticle)
        await btn.waitFor({ timeout: 10000 })

        // 监听新页面打开
        const newPagePromise = browser.waitForEvent('page', { timeout: 30000 }).catch(() => null)

        await btn.click()

        // 等待新页面
        const newPage = await newPagePromise
        if (newPage) {
          console.log('检测到新标签页，切换到编辑器')
          await newPage.waitForLoadState('networkidle', { timeout: 30000 }).catch(() => {})
          page = newPage
          inEditor = true
        }
        await page.waitForTimeout(5000)
      } catch {
        await page.goto(
          'https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=10&lang=zh_CN',
          { waitUntil: 'networkidle', timeout: 20000 }
        )
        await page.waitForTimeout(5000)
        inEditor = !page.url().includes('login')
      }

      // 等编辑器渲染完毕后再等 3 秒
      await page.waitForTimeout(3000)

      // ====== DOM 诊断（测试完就删） ======
      const domReport = await page.evaluate(() => {
        const report: string[] = []
        const inputs = document.querySelectorAll('input, textarea, [contenteditable="true"]')
        for (const el of inputs) {
          const id = (el as HTMLElement).id || '(无id)'
          const tag = (el as HTMLElement).tagName.toLowerCase()
          const ph = ((el as any).placeholder || '').slice(0, 15)
          const tp = (el as HTMLInputElement).type || ''
          report.push(`${tag}#${id}[ph:${ph}][t:${tp}]`)
        }
        const frames = document.querySelectorAll('iframe')
        for (const f of frames) {
          report.push(`iframe#${f.id || '(无id)'}`)
        }
        return report.join('\n') || '(未找到可编辑元素)'
      })
      // 同时写入桌面文件
      const fs = await import('fs')
      fs.writeFileSync(path.join(os.homedir(), 'Desktop', 'dom-report.txt'), domReport, 'utf-8')

      // ====== 以下是填内容 ======

      // 5. 用 JS 直接注入内容 — 不依赖 Playwright 选择器等待
      let titleOk = false, bodyOk = false, authorOk = false, saved = false

      await page.evaluate((data: any) => {
        // 标题：找 #js_title_main 下的可编辑元素
        const titleArea = document.querySelector('#js_title_main')
        if (titleArea) {
          const input = titleArea.querySelector('input, textarea, [contenteditable="true"]') as HTMLElement
          if (input) {
            if ('value' in input) (input as any).value = data.title
            else input.textContent = data.title
            input.dispatchEvent(new Event('input', { bubbles: true }))
            data.__titleOk = true
          }
        }

        // 正文：进入 #ueditor_0 iframe
        const editorFrame = document.querySelector('#ueditor_0') as HTMLIFrameElement
        if (editorFrame?.contentDocument) {
          const body = editorFrame.contentDocument.querySelector('[contenteditable="true"], body')
          if (body) {
            body.textContent = data.body
            body.dispatchEvent(new Event('input', { bubbles: true }))
            data.__bodyOk = true
          }
        }

        // 作者
        const authorInput = document.querySelector('#author') as HTMLInputElement
        if (authorInput) {
          authorInput.value = data.authorName
          authorInput.dispatchEvent(new Event('input', { bubbles: true }))
          data.__authorOk = true
        }
      }, { title: content.title, body: content.body, authorName: content.title.slice(0, 8) })

      // 提取 evaluate 执行结果（因为 __ 属性会挂在传入对象上）
      // JS evaluate 不能直接返回被序列化问题影响的值，改用两次 evaluate
      titleOk = await page.evaluate(() => {
        const a = document.querySelector('#js_title_main input, #js_title_main textarea') as HTMLInputElement
        return a ? a.value.length > 0 : false
      })

      bodyOk = await page.evaluate(() => {
        const f = document.querySelector('#ueditor_0') as HTMLIFrameElement
        if (f?.contentDocument) {
          const b = f.contentDocument.querySelector('[contenteditable="true"], body')
          return b ? (b.textContent || '').length > 10 : false
        }
        return false
      })

      authorOk = await page.evaluate(() => {
        const a = document.querySelector('#author') as HTMLInputElement
        return a ? a.value.length > 0 : false
      })

      // 6. 保存
      try {
        const sbtn = page.locator('#js_submit > button')
        await sbtn.waitFor({ timeout: 5000 })
        await sbtn.click()
        await page.waitForTimeout(2000)
        saved = true
      } catch (e: any) { }

      let msg = `标题:${titleOk ? '✅' : '❌'} 正文:${bodyOk ? '✅' : '❌'} 作者:${authorOk ? '✅' : '❌'} 保存:${saved ? '✅' : '❌'}`
      msg += ' | DOM报告已存到桌面 dom-report.txt'
      msg += '。请检查浏览器'
      return { success: true, platform: PlatformType.WECHAT_MP, message: msg }
    } catch (err: any) {
      return { success: false, platform: PlatformType.WECHAT_MP, message: `异常: ${err.message}` }
    }
  }
}

export const wechatPublisher = new WeChatPublisher()
