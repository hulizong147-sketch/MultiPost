/**
 * 微信公众号 Publisher — Playwright 全自动发布
 *
 * 公众号后台: https://mp.weixin.qq.com/
 *
 * 公众号编辑器复杂：不是标准 textarea，是类 Word 富文本编辑器。
 * 策略：导航到编辑器 → 检测登录 → 等待用户扫码 → 填入内容 → 保存
 */
import { PlatformType } from '@multipost/shared'
import type { PlatformContent } from '@multipost/shared'
import path from 'path'
import os from 'os'
import { BasePublisher, type PublishResult } from './base.js'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const USER_DATA_DIR = path.join(os.homedir(), '.multipost', 'chrome-wechat')
const DASHBOARD = 'https://mp.weixin.qq.com/'
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

      // 1. 导航到公众号后台
      await page.goto(DASHBOARD, { waitUntil: 'domcontentloaded', timeout: 30000 })
      // 等页面稳定（OAuth 跳转完成）
      await page.waitForTimeout(5000)

      // 2. 检测是否在登录页 — 温和等待，不立即判断失败
      let needLogin = false
      try {
        needLogin = page.url().includes('login') || page.url().includes('qrconnect')
      } catch { needLogin = true }

      if (needLogin) {
        console.log('🔄 请在浏览器中扫码登录公众号（浏览器窗口保持打开，你有充足时间扫码）')
        // 等 login 关键词消失，给 OAuth 跳转留 30 秒缓冲
        const loggedIn = await this.waitForLogin(page, ['login', 'qrconnect'], 60)
        if (!loggedIn) {
          // 不立即失败，可能是 Cookie 已生效但 URL 未变
          console.log('⚠️  URL 检测超时，尝试继续...')
        }
      }

      // 3. 导航到编辑器
      await page.goto(EDITOR_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(5000)

      // 4. 二次确认：如果又被重定向到登录页
      if (page.url().includes('login') || page.url().includes('qrconnect')) {
        await browser.close()
        return { success: false, platform: PlatformType.WECHAT_MP, message: '公众号登录未完成，请确认扫码后重试' }
      }

      // 5. 填入标题
      const titleSels = ['#title', 'input[placeholder*="标题"]', '.editor_title input', '[id*="title"]']
      let titleOk = false
      for (const sel of titleSels) {
        try {
          const el = page.locator(sel).first()
          await el.waitFor({ timeout: 5000 })
          await el.click()
          await el.fill(content.title)
          titleOk = true
          break
        } catch { continue }
      }
      if (!titleOk) {
        await browser.close()
        return { success: false, platform: PlatformType.WECHAT_MP, message: '未找到标题输入框。请确认已登录公众号后台' }
      }

      // 6. 填入正文
      const bodySels = ['#ueditor_0', '[contenteditable="true"]', '.rich_media_content']
      let bodyOk = false
      for (const sel of bodySels) {
        try {
          const el = page.locator(sel).first()
          await el.waitFor({ timeout: 5000 })
          await el.click()
          await page.keyboard.type(content.body, { delay: 2 })
          bodyOk = true
          break
        } catch { continue }
      }
      if (!bodyOk) {
        await browser.close()
        return { success: false, platform: PlatformType.WECHAT_MP, message: '未找到正文编辑区，公众号页面结构可能已变更' }
      }

      await page.waitForTimeout(1000)

      // 7. 保存
      const saveBtn = page.locator('button:has-text("保存"), .js_submit, #js_save, [id*="save"]').first()
      try {
        await saveBtn.waitFor({ timeout: 8000 })
        await saveBtn.click()
        await page.waitForTimeout(3000)
      } catch {
        // 保存按钮可能不叫"保存"
        console.log('⚠️  未找到保存按钮，请手动保存')
      }

      await browser.close()

      return {
        success: true,
        platform: PlatformType.WECHAT_MP,
        message: '公众号图文已保存，请到后台确认并群发',
      }
    } catch (err: any) {
      if (browser) try { await browser.close() } catch {}
      return { success: false, platform: PlatformType.WECHAT_MP, message: `公众号发布异常: ${err.message}` }
    }
  }
}

export const wechatPublisher = new WeChatPublisher()
