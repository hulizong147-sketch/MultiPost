/**
 * 微信公众号 Publisher
 *
 * 永不自动关闭浏览器 — 成功或失败都留在屏幕上让用户看。
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
      const page = browser.pages()[0]

      // 1. 编辑器
      await page.goto(EDITOR, { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForTimeout(4000)

      // 2. 登录
      if (page.url().includes('login') || page.url().includes('qrconnect')) {
        const ok = await this.waitForLogin(page, ['login', 'qrconnect'], 60)
        if (!ok) return { success: false, platform: PlatformType.WECHAT_MP, message: '登录超时' }
        await page.goto(EDITOR, { waitUntil: 'networkidle', timeout: 20000 })
        await page.waitForTimeout(5000)
      }

      // 3. 截图
      try {
        await page.screenshot({ path: path.join(os.homedir(), 'Desktop', 'wechat-publish.png') })
      } catch {}

      // 4. 标题
      try {
        const el = page.locator('#js_title_main div').first()
        await el.waitFor({ timeout: 10000 })
        await el.click()
        await page.keyboard.press('Control+a')
        await page.waitForTimeout(300)
        await el.type(content.title, { delay: 10 })
      } catch { /* 标题失败继续 */ }

      // 5. 正文 — iframe
      try {
        const fh = page.locator('#ueditor_0')
        await fh.waitFor({ timeout: 8000 })
        const frame = await fh.contentFrame()
        if (frame) {
          const area = frame.locator('[contenteditable="true"], body').first()
          await area.waitFor({ timeout: 5000 })
          await area.click()
          await frame.keyboard.press('Control+a')
          await frame.waitForTimeout(300)
          await area.type(content.body, { delay: 2 })
        }
      } catch { /* 正文失败继续 */ }

      // 6. 保存
      try {
        const btn = page.locator('#js_save, button:has-text("保存"), [id*="save"]').first()
        await btn.waitFor({ timeout: 5000 })
        await btn.click()
        await page.waitForTimeout(2000)
      } catch { /* 保存失败继续 */ }

      // 浏览器保持打开 — 用户可手动完成
      return { success: true, platform: PlatformType.WECHAT_MP, message: '公众号操作完成，请检查浏览器窗口' }

    } catch (err: any) {
      // 极端异常 — 浏览器可能自己挂了
      return { success: false, platform: PlatformType.WECHAT_MP, message: `异常: ${err.message}` }
    }
  }
}

export const wechatPublisher = new WeChatPublisher()
