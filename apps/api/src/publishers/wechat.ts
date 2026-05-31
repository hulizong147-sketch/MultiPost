/**
 * 微信公众号 Publisher
 *
 * 正文不在 iframe 里！在主页面 #ueditor_0 > div > div > div > div > section
 */
import { PlatformType } from '@multipost/shared'
import type { PlatformContent } from '@multipost/shared'
import path from 'path'
import os from 'os'
import { BasePublisher, type PublishResult } from './base.js'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const UDD = path.join(os.homedir(), '.multipost', 'chrome-wechat')

function cleanLock() {
  const locks = ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile']
  for (const f of locks) { try { require('fs').unlinkSync(path.join(UDD, f)) } catch {} }
}

export class WeChatPublisher extends BasePublisher {
  readonly platformType = PlatformType.WECHAT_MP

  async publish(content: PlatformContent): Promise<PublishResult> {
    const { chromium } = await import('playwright')
    let browser: any = null
    cleanLock()

    try {
      browser = await chromium.launchPersistentContext(UDD, {
        headless: false, executablePath: CHROME,
        viewport: { width: 1280, height: 900 },
        args: BasePublisher.CHROME_ARGS,
      })
      let page = browser.pages()[0]
      page.on('dialog', (d: any) => d.accept())

      // 1. 导航
      await page.goto('https://mp.weixin.qq.com/', { waitUntil: 'domcontentloaded', timeout: 20000 })
      await page.waitForTimeout(2000)

      if (page.url().includes('login') || page.url().includes('qrconnect')) {
        const ok = await this.waitForLogin(page, ['login', 'qrconnect'], 60)
        if (!ok) return { success: false, platform: PlatformType.WECHAT_MP, message: '登录超时' }
        await page.waitForTimeout(3000)
      }

      // 2. 进编辑器
      try {
        const p = browser.waitForEvent('page', { timeout: 15000 }).catch(() => null)
        await page.getByText('文章', { exact: true }).first().click({ timeout: 5000 })
        const np = await p
        if (np) { await np.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {}); page = np }
      } catch {
        await page.goto('https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=10&lang=zh_CN', { waitUntil: 'domcontentloaded', timeout: 15000 })
      }
      await page.waitForTimeout(5000)

      // 3. 正文 — 生成封面图 + 写入主页面 #ueditor_0 section
      await page.evaluate((data: string) => {
        const { html, title } = JSON.parse(data)
        // 生成一张 900x500 标题封面图
        const c = document.createElement('canvas')
        c.width = 900; c.height = 500
        const ctx = c.getContext('2d')!
        ctx.fillStyle = '#1677ff'
        ctx.fillRect(0, 0, 900, 500)
        ctx.fillStyle = '#fff'
        ctx.font = 'bold 48px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(title.slice(0, 20), 450, 220)
        ctx.font = '24px sans-serif'
        ctx.fillText('MultiPost', 450, 300)
        const img = '<img src="'+c.toDataURL('image/png')+'" style="width:100%;max-width:900px;margin-bottom:16px"/>'

        const el = document.querySelector('#ueditor_0 > div > div > div > div > section') as HTMLElement | null
        if (el) { el.innerHTML = img + html; el.dispatchEvent(new Event('input', { bubbles: true })) }
      }, JSON.stringify({ html: content.body, title: content.title }))

      // 4. 标题 — #js_title_main
      await page.evaluate((text: string) => {
        const el = document.querySelector('#js_title_main > div > div > div > div') as HTMLElement | null
        if (el) {
          if (el.getAttribute('contenteditable') != null) {
            el.innerText = text; el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }))
          } else {
            const s = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
            s.call(el, text)
            el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }))
          }
        }
      }, content.title)

      // 5. 作者
      try { await page.locator('#author').fill(content.title.slice(0, 8), { timeout: 3000 }) } catch {}

      // 6. 保存
      try { await page.locator('button:has-text("保存")').first().click({ timeout: 5000 }); await page.waitForTimeout(1000) } catch {}

      return { success: true, platform: PlatformType.WECHAT_MP, message: '公众号发布完成' }

    } catch (err: any) {
      return { success: false, platform: PlatformType.WECHAT_MP, message: `异常: ${err.message}` }
    }
  }
}

export const wechatPublisher = new WeChatPublisher()
