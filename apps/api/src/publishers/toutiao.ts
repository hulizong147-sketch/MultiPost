/**
 * 今日头条 Publisher — Playwright 全自动发布
 *
 * 头条号后台: https://mp.toutiao.com/
 * 发布文章入口: https://mp.toutiao.com/profile_v4/graphic/publish
 */
import { PlatformType } from '@multipost/shared'
import type { PlatformContent } from '@multipost/shared'
import path from 'path'
import os from 'os'
import { BasePublisher, type PublishResult } from './base.js'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const USER_DATA_DIR = path.join(os.homedir(), '.multipost', 'chrome-toutiao')
const EDITOR_URL = 'https://mp.toutiao.com/profile_v4/graphic/publish'

export class ToutiaoPublisher extends BasePublisher {
  readonly platformType = PlatformType.TOUTIAO

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

      if (page.url().includes('login') || page.url().includes('passport')) {
        console.log('🔄 请在浏览器中登录头条号...')
        const loggedIn = await this.waitForLogin(page, ['login', 'passport'])
        if (!loggedIn) {
          await browser.close()
          return { success: false, platform: PlatformType.TOUTIAO, message: '头条登录超时（3分钟），请重试' }
        }
        await page.goto(EDITOR_URL, { waitUntil: 'domcontentloaded', timeout: 20000 })
        await page.waitForTimeout(2000)
      }

      // 填入标题
      const titleSel = 'input[placeholder*="标题"], .title-input input, [class*="title"] input'
      const titleEl = page.locator(titleSel).first()
      await titleEl.waitFor({ timeout: 10000 })
      await titleEl.click()
      await titleEl.fill(content.title)

      // 填入正文
      const bodySels = [
        '[contenteditable="true"]',
        '.ql-editor',
        '.editor-content',
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
        return { success: false, platform: PlatformType.TOUTIAO, message: '未找到头条正文编辑区，页面结构可能已变更' }
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
        platform: PlatformType.TOUTIAO,
        url: finalUrl,
        message: `发布完成，请到头条号确认`,
      }
    } catch (err: any) {
            return { success: false, platform: PlatformType.TOUTIAO, message: `头条发布异常: ${err.message}` }
    }
  }
}

export const toutiaoPublisher = new ToutiaoPublisher()
