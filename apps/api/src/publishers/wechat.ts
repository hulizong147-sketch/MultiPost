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

      // 3. 标题 — click → select all → type
      try {
        const t = page.locator('#title')
        await t.click({ timeout: 5000 })
        await page.keyboard.press('Control+a')
        await page.keyboard.type(content.title, { delay: 5 })
        await page.waitForTimeout(300)
        const v = await t.inputValue().catch(() => '')
        titleOk = v.length > 0
      } catch {}

      // 4. 正文 iframe — click → select all → type
      try {
        const frame = await page.locator('iframe').first().contentFrame({ timeout: 5000 })
        if (frame) {
          const b = frame.locator('[contenteditable="true"], body').first()
          await b.click({ timeout: 5000 })
          await frame.keyboard.press('Control+a')
          await frame.keyboard.type(content.body, { delay: 1 })
          await page.waitForTimeout(300)
          bodyOk = ((await b.textContent()) || '').length > 10
        }
      } catch {}

      // 5. 作者（可选，不影响主流程）
      try { await page.locator('#author').fill(content.title.slice(0, 8), { timeout: 3000 }) } catch {}

      // 6. 保存
      if (titleOk && bodyOk) {
        try {
          await page.locator('button:has-text("保存"), button:has-text("发表")').first().click({ timeout: 5000 })
          await page.waitForTimeout(1500)
          saved = true
        } catch {}
      }

      return { success: true, platform: PlatformType.WECHAT_MP, message: `标题[${titleOk?'✅':'❌'}] 正文[${bodyOk?'✅':'❌'}] 保存[${saved?'✅':'❌'}]` }
    } catch (err: any) {
      return { success: false, platform: PlatformType.WECHAT_MP, message: `异常: ${err.message}` }
    }
  }
}

export const wechatPublisher = new WeChatPublisher()
