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
      const page = browser.pages()[0]

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

      // 4. 点击「新建图文」进入编辑器
      let inEditor = false
      try {
        const btn = page.locator(SEL.newArticle)
        await btn.waitFor({ timeout: 10000 })
        await btn.click()
        await page.waitForTimeout(8000)  // 编辑器加载需要时间
        inEditor = true
      } catch {
        await page.goto(
          'https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=10&lang=zh_CN',
          { waitUntil: 'networkidle', timeout: 20000 }
        )
        await page.waitForTimeout(8000)
        inEditor = !page.url().includes('login')
      }

      // 再等一会确保 React 组件和 iframe 完全渲染
      // 再等一会确保组件渲染
      await page.waitForTimeout(3000)

      // 5. 用 JS 直接注入内容 — 不依赖 Playwright 选择器等待
      let titleOk = false, bodyOk = false, authorOk = false, saved = false
      let titleErr = '', bodyErr = '', authorErr = '', saveErr = ''

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
      } catch (e: any) { saveErr = e.message?.split('\n')[0] || '' }

      let msg = `标题:${titleOk ? '✅' : '❌'} 正文:${bodyOk ? '✅' : '❌'} 作者:${authorOk ? '✅' : '❌'} 保存:${saved ? '✅' : '❌'}`
      if (!titleOk) msg += ` | 标题:${titleErr}`
      if (!bodyOk) msg += ` | 正文:${bodyErr}`
      if (!authorOk) msg += ` | 作者:${authorErr}`
      if (!saved) msg += ` | 保存:${saveErr}`
      msg += '。请检查浏览器'
      return { success: true, platform: PlatformType.WECHAT_MP, message: msg }
    } catch (err: any) {
      return { success: false, platform: PlatformType.WECHAT_MP, message: `异常: ${err.message}` }
    }
  }
}

export const wechatPublisher = new WeChatPublisher()
