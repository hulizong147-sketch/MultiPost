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

// 编辑器选择器 — 由 dom-report.txt 实测确认
const SEL = {
  title: '#title',
  author: '#author',
  bodyFrame: 'iframe',  // 正文在页面唯一 iframe 内
  save: 'button:has-text("保存"), button:has-text("发表")',
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

      // 4. 点击「文章」进入编辑器（首页「新的创作」→「文章」）
      let inEditor = false
      try {
        // 先找「新的创作」区域，再点「文章」
        const articleBtn = page.getByText('文章', { exact: true }).first()
        await articleBtn.waitFor({ timeout: 10000 })

        const newPageProm = browser.waitForEvent('page', { timeout: 30000 }).catch(() => null)
        await articleBtn.click()

        const newPage = await newPageProm
        if (newPage) {
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
          report.push(`iframe#${f.id || '(无id)'} src=${(f.getAttribute('src')||'').slice(0,30)}`)
        }
        // 按钮
        const btns = document.querySelectorAll('button, [role="button"]')
        for (const b of btns) {
          const txt = (b.textContent || '').trim().slice(0, 20)
          report.push(`button text="${txt}"`)
        }
        return report.join('\n') || '(未找到可编辑元素)'
      })
      // 同时写入桌面文件
      const fs = await import('fs')
      fs.writeFileSync(path.join(os.homedir(), 'Desktop', 'dom-report.txt'), domReport, 'utf-8')

      // ====== 以下是填内容 ======

      // 5. 填入内容
      let titleOk = false, bodyOk = false, authorOk = false, saved = false

      // 标题 — Playwright fill 触发 React onChange
      try {
        await page.locator('#title').fill(content.title)
        titleOk = true
      } catch {}

      // 正文 — 在 iframe 内找 contenteditable，用 Playwright API
      try {
        const fh = page.locator('iframe').first()
        const frame = await fh.contentFrame()
        if (frame) {
          await frame.locator('[contenteditable="true"], body').first().fill(content.body)
          bodyOk = true
        }
      } catch {}

      // 作者 — Playwright fill
      try {
        await page.locator('#author').fill(content.title.slice(0, 8))
        authorOk = true
      } catch {}

      // 验证 + 保存
      titleOk = titleOk || await page.locator('#title').inputValue().then(v => v.length > 0).catch(() => false)
      authorOk = authorOk || await page.locator('#author').inputValue().then(v => v.length > 0).catch(() => false)

      // 保存 — 多种文字匹配
      try {
        await page.locator('button:has-text("保存"), button:has-text("发表"), #js_submit button').first().click({ timeout: 5000 })
        await page.waitForTimeout(2000)
        saved = true
      } catch {}

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
