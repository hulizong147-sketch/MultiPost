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
import fs from 'fs'
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
        const ok = await this.waitForLogin(page, ['login', 'qrconnect'], 30)
        if (!ok) return { success: false, platform: PlatformType.WECHAT_MP, message: '登录超时' }
        await page.waitForTimeout(2000)
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

      // 给 React 渲染多几秒时间
      await page.waitForTimeout(3000)

      let titleOk = false, bodyOk = false, saved = false

      // 3. 标题 — execCommand insertText（标题是纯文本 ✓）
      try {
        await page.locator('#title').click({ timeout: 5000 })
        await page.keyboard.press('Control+a')
        await page.keyboard.type(content.title, { delay: 5 })
        await page.waitForTimeout(300)
        titleOk = await page.locator('#title').inputValue().then(v => v.length > 0).catch(() => false)
      } catch {}

      // 4. 正文 — innerHTML（公众号适配器输出 HTML，不是纯文本）
      try {
        await page.evaluate((html: string) => {
          const f = document.querySelector('iframe') as HTMLIFrameElement | null
          const doc = f?.contentDocument
          const el = doc?.querySelector('[contenteditable="true"]') || doc?.body
          if (el) {
            el.innerHTML = html
            el.dispatchEvent(new Event('input', { bubbles: true }))
          } else { (window as any).__wb_debug = 'body el NOT FOUND' }
        }, content.body)
        await page.waitForTimeout(500)
        bodyOk = await page.evaluate(() => {
          const f = document.querySelector('iframe') as HTMLIFrameElement | null
          const el = f?.contentDocument?.querySelector('[contenteditable="true"]') || f?.contentDocument?.body
          return el ? (el.textContent || '').length > 10 : false
        })
      } catch {}

      // 5. 作者
      try { await page.locator('#author').fill(content.title.slice(0, 8), { timeout: 3000 }) } catch {}

      // 6. 验证 + 保存
      const debug = await page.evaluate(() => (window as any).__wb_debug || '')
      if (titleOk && bodyOk) {
        try {
          await page.locator('button:has-text("保存"), button:has-text("发表")').first().click({ timeout: 5000 })
          await page.waitForTimeout(1500)
          saved = true
        } catch {}
      }

      // 结果写入桌面文件（避免超时看不到）
      const msg = `${debug ? 'DBG:' + debug + ' ' : ''}标题[${titleOk?'OK':'NO'}] 正文[${bodyOk?'OK':'NO'}] 保存[${saved?'OK':'NO'}]`
      fs.writeFileSync(path.join(os.homedir(), 'Desktop', 'publish-result.txt'), msg, 'utf-8')

      return { success: true, platform: PlatformType.WECHAT_MP, message: msg }
    } catch (err: any) {
      return { success: false, platform: PlatformType.WECHAT_MP, message: `异常: ${err.message}` }
    }
  }
}

export const wechatPublisher = new WeChatPublisher()
