/**
 * 小红书 Publisher — Playwright 全自动发布
 *
 * 小红书创作中心: https://creator.xiaohongshu.com/
 * 发布笔记: https://creator.xiaohongshu.com/publish/publish
 *
 * 小红书以短笔记为主，适配器已输出纯文本（含话题标签）。
 * 策略：将文本填入内容区，自动发布。
 */
import { PlatformType } from '@multipost/shared'
import type { PlatformContent } from '@multipost/shared'
import path from 'path'
import os from 'os'
import { BasePublisher, type PublishResult } from './base.js'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const USER_DATA_DIR = path.join(os.homedir(), '.multipost', 'chrome-xiaohongshu')
const EDITOR_URL = 'https://creator.xiaohongshu.com/publish/publish'

export class XiaohongshuPublisher extends BasePublisher {
  readonly platformType = PlatformType.XIAOHONGSHU

  async publish(content: PlatformContent): Promise<PublishResult> {
    const { chromium } = await import('playwright')
    let browser: any = null

    try {
      browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
        headless: false,
        executablePath: CHROME_PATH,
        viewport: { width: 1280, height: 900 },
        args: BasePublisher.CHROME_ARGS,
      })
      const page = browser.pages()[0]

      await page.goto(EDITOR_URL, { waitUntil: 'domcontentloaded', timeout: 20000 })
      await page.waitForTimeout(3000)

      // 检测登录
      if (page.url().includes('login') || page.url().includes('signin')) {
        console.log('🔄 请在浏览器中登录小红书...')
        const loggedIn = await this.waitForLogin(page, ['login', 'signin'])
        if (!loggedIn) {
          await browser.close()
          return { success: false, platform: PlatformType.XIAOHONGSHU, message: '小红书登录超时（3分钟），请重试' }
        }
        await page.goto(EDITOR_URL, { waitUntil: 'domcontentloaded', timeout: 20000 })
        await page.waitForTimeout(2000)
      }

      // 填入标题（小红书笔记标题）
      const titleSel = 'input[placeholder*="标题"], [class*="title"] input, #title'
      const titleEl = page.locator(titleSel).first()
      await titleEl.waitFor({ timeout: 10000 })
      await titleEl.click()
      await titleEl.fill(content.title.slice(0, 20)) // 小红书标题通常较短

      // 填入正文
      const bodySels = [
        '[contenteditable="true"]',
        '[placeholder*="正文"]',
        '[placeholder*="想"]',
        '[class*="content"] [contenteditable]',
        '[class*="editor"] [contenteditable]',
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
        return { success: false, platform: PlatformType.XIAOHONGSHU, message: '未找到小红书正文编辑区，页面结构可能已变更' }
      }

      await page.waitForTimeout(1000)

      // 点击发布
      const publishBtn = page.locator(
        'button:has-text("发布"), button:has-text("发表"), .publish-btn, [class*="publish"]'
      ).first()
      await publishBtn.waitFor({ timeout: 10000 })
      await publishBtn.click()

      await page.waitForTimeout(5000)
      const finalUrl = page.url()
      await browser.close()

      return {
        success: true,
        platform: PlatformType.XIAOHONGSHU,
        url: finalUrl,
        message: `小红书发布完成`,
      }
    } catch (err: any) {
            return { success: false, platform: PlatformType.XIAOHONGSHU, message: `小红书发布异常: ${err.message}` }
    }
  }
}

export const xiaohongshuPublisher = new XiaohongshuPublisher()
