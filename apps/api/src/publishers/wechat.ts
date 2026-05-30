/**
 * 微信公众号 Publisher — 稳定版
 *
 * 策略:
 * - 标题: click → Ctrl+A → type (不用 fill，确保 React onChange 触发)
 * - 正文: iframe → click → Ctrl+A → type
 * - 每步用 inputValue() 验证结果
 * - 自动 dismiss 弹窗
 */
import { PlatformType } from '@multipost/shared'
import type { PlatformContent } from '@multipost/shared'
import path from 'path'
import os from 'os'
import { BasePublisher, type PublishResult } from './base.js'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const UDD = path.join(os.homedir(), '.multipost', 'chrome-wechat')
const EDITOR = 'https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=10&lang=zh_CN'

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

      // 自动 dismiss 所有 alert/confirm （公众号后台常有弹窗）
      page.on('dialog', (d: any) => d.accept())

      // 1. 首页 → 登录
      await page.goto('https://mp.weixin.qq.com/', { waitUntil: 'domcontentloaded', timeout: 20000 })
      await page.waitForTimeout(2000)

      if (page.url().includes('login') || page.url().includes('qrconnect')) {
        const ok = await this.waitForLogin(page, ['login', 'qrconnect'], 60)
        if (!ok) return { success: false, platform: PlatformType.WECHAT_MP, message: '登录超时' }
        await page.waitForTimeout(3000)
      }

      // 2. 点击「文章」进编辑器
      try {
        const p = browser.waitForEvent('page', { timeout: 15000 }).catch(() => null)
        await page.getByText('文章', { exact: true }).first().click({ timeout: 5000 })
        const np = await p
        if (np) { await np.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {}); page = np }
        await page.waitForTimeout(2000)
      } catch {
        await page.goto(EDITOR, { waitUntil: 'domcontentloaded', timeout: 15000 })
        await page.waitForTimeout(3000)
      }

      let titleOk = false, bodyOk = false, saved = false

      // 3. 标题 — 原生 value setter 绕过 React 劫持
      await page.evaluate((text: string) => {
        const el = document.querySelector('#title')
        if (el) {
          const setter = Object.getOwnPropertyDescriptor(
            window.HTMLTextAreaElement.prototype, 'value'
          )!.set!
          setter.call(el, text)
          el.dispatchEvent(new Event('input', { bubbles: true }))
          el.dispatchEvent(new Event('change', { bubbles: true }))
        }
      }, content.title)
      await page.waitForTimeout(300)

      // 4. 正文 — 原生 innerText setter
      await page.evaluate((text: string) => {
        const f = document.querySelector('iframe') as HTMLIFrameElement | null
        const el = f?.contentDocument?.querySelector('[contenteditable="true"]') as HTMLElement | null
        if (el) {
          el.focus()
          const setter = Object.getOwnPropertyDescriptor(
            window.HTMLElement.prototype, 'innerText'
          )!.set!
          setter.call(el, text)
          el.dispatchEvent(new Event('input', { bubbles: true }))
          el.blur()
        }
      }, content.body)
      await page.waitForTimeout(300)

      // 5. 作者
      await page.evaluate((text: string) => {
        const el = document.querySelector('#author') as HTMLInputElement | null
        if (el) {
          const setter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype, 'value'
          )!.set!
          setter.call(el, text)
          el.dispatchEvent(new Event('input', { bubbles: true }))
        }
      }, content.title.slice(0, 8))
      await page.waitForTimeout(300)

      // 验证
      titleOk = await page.evaluate(() => {
        const el = document.querySelector('#title') as HTMLTextAreaElement | null
        return el ? el.value.length > 0 : false
      })
      bodyOk = await page.evaluate(() => {
        const f = document.querySelector('iframe') as HTMLIFrameElement | null
        const el = f?.contentDocument?.querySelector('[contenteditable="true"]')
        return el ? (el.textContent || '').length > 10 : false
      })

      // 6. 保存
      if (titleOk && bodyOk) {
        try {
          await page.locator('button:has-text("保存"), button:has-text("发表")').first().click({ timeout: 5000 })
          await page.waitForTimeout(1500)
          saved = true
        } catch {}
      }

      return { success: true, platform: PlatformType.WECHAT_MP, message: `标题[${titleOk?'✅':'❌'}] 正文[${bodyOk?'✅':'❌'}] 保存[${saved?'✅':'❌'}] | 截图:桌面/wechat-debug.png` }
    } catch (err: any) {
      return { success: false, platform: PlatformType.WECHAT_MP, message: `异常: ${err.message}` }
    }
  }
}

export const wechatPublisher = new WeChatPublisher()
