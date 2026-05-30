/**
 * 微信公众号 Publisher — Playwright 全自动发布
 *
 * 公众号后台: https://mp.weixin.qq.com/
 * 新建图文: https://mp.weixin.qq.com/cgi-bin/appmsg?action=new
 *
 * 公众号编辑器是最复杂的 — 不是标准 textarea，而是类 Word 的富文本编辑器。
 * 策略：先尝试找到编辑区并注入 HTML 内容。
 */
import { PlatformType } from '@multipost/shared'
import type { PlatformContent } from '@multipost/shared'
import path from 'path'
import os from 'os'
import { BasePublisher, type PublishResult } from './base.js'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const USER_DATA_DIR = path.join(os.homedir(), '.multipost', 'chrome-wechat')
const EDITOR_URL = 'https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=10&lang=zh_CN'

export class WeChatPublisher extends BasePublisher {
  readonly platformType = PlatformType.WECHAT_MP

  async publish(content: PlatformContent): Promise<PublishResult> {
    const { chromium } = await import('playwright')
    let browser: any = null

    try {
      browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
        headless: false,
        executablePath: CHROME_PATH,
        viewport: { width: 1280, height: 900 },
      })
      const page = await browser.newPage()

      // 先访问公众号首页确保登录
      await page.goto('https://mp.weixin.qq.com/', { waitUntil: 'domcontentloaded', timeout: 20000 })
      await page.waitForTimeout(3000)

      // 检测登录 — 如果需要扫码，等用户扫完
      if (page.url().includes('login') || page.url().includes('qrconnect')) {
        console.log('🔄 请在浏览器中扫码登录公众号...')
        const loggedIn = await this.waitForLogin(page, ['login', 'qrconnect'])
        if (!loggedIn) {
          await browser.close()
          return { success: false, platform: PlatformType.WECHAT_MP, message: '公众号登录超时（3分钟），请重试' }
        }
        // 登录成功，重新导航到编辑器
        await page.goto(EDITOR_URL, { waitUntil: 'domcontentloaded', timeout: 20000 })
        await page.waitForTimeout(3000)
      } else {
        // 已登录，直接导航到编辑器
        await page.goto(EDITOR_URL, { waitUntil: 'domcontentloaded', timeout: 20000 })
        await page.waitForTimeout(3000)
      }

      // 填入标题
      const titleSel = '#title, input[placeholder*="标题"], .editor_title input'
      const titleEl = page.locator(titleSel).first()
      await titleEl.waitFor({ timeout: 10000 })
      await titleEl.click()
      await titleEl.fill(content.title)

      // 填入正文 — 公众号编辑器是 iframe 内的 contenteditable
      const bodySels = [
        '#ueditor_0',
        '[contenteditable="true"]',
        '.rich_media_content',
      ]
      let bodyFilled = false
      for (const sel of bodySels) {
        try {
          const el = page.locator(sel).first()
          await el.waitFor({ timeout: 3000 })
          await el.click()
          await page.keyboard.type(content.body, { delay: 2 })
          bodyFilled = true
          break
        } catch { continue }
      }
      if (!bodyFilled) {
        await browser.close()
        return { success: false, platform: PlatformType.WECHAT_MP, message: '未找到公众号正文编辑区，页面结构可能已变更' }
      }

      await page.waitForTimeout(1000)

      // 点击「保存并群发」或「预览」
      const saveBtn = page.locator(
        'button:has-text("保存"), .js_submit, #js_save, [id*="save"]'
      ).first()
      await saveBtn.waitFor({ timeout: 10000 })
      await saveBtn.click()

      await page.waitForTimeout(3000)
      await browser.close()

      return {
        success: true,
        platform: PlatformType.WECHAT_MP,
        message: '公众号图文已保存，请在公众号后台确认并群发',
      }
    } catch (err: any) {
      if (browser) try { await browser.close() } catch {}
      return { success: false, platform: PlatformType.WECHAT_MP, message: `公众号发布异常: ${err.message}` }
    }
  }
}

export const wechatPublisher = new WeChatPublisher()
