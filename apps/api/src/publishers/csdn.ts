import { PlatformType } from '@multipost/shared'
import type { PlatformContent } from '@multipost/shared'
import path from 'path'
import os from 'os'
import { BasePublisher, type PublishResult } from './base.js'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const USER_DATA_DIR = path.join(os.homedir(), '.multipost', 'chrome-csdn')
const EDITOR_URL = 'https://editor.csdn.net/md?not_checkout=1'

export class CSDNPublisher extends BasePublisher {
  readonly platformType = PlatformType.CSDN

  async publish(content: PlatformContent): Promise<PublishResult> {
    const { chromium } = await import('playwright')
    let browser: any = null

    try {
      // Electron 桌面环境 — 无沙箱限制，Playwright 完全可用
      browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
        headless: false,
        executablePath: CHROME_PATH,
        viewport: { width: 1280, height: 900 },
        args: BasePublisher.CHROME_ARGS,
      })

      const page = browser.pages()[0]

      // 1. 打开 CSDN Markdown 编辑器
      await page.goto(EDITOR_URL, { waitUntil: 'domcontentloaded', timeout: 20000 })
      await page.waitForTimeout(3000)

      // 2. 检测登录 — 等待用户完成登录
      if (page.url().includes('passport') || page.url().includes('login')) {
        console.log('🔄 请在浏览器中登录 CSDN（首次登录后 Cookie 会被保存）...')
        const loggedIn = await this.waitForLogin(page, ['passport', 'login'])
        if (!loggedIn) {
          await browser.close()
          return { success: false, platform: PlatformType.CSDN, message: 'CSDN 登录超时（3分钟），请重试' }
        }
        // 登录成功后重新导航
        await page.goto(EDITOR_URL, { waitUntil: 'domcontentloaded', timeout: 20000 })
        await page.waitForTimeout(2000)
      }

      // 3. 填入标题
      const titleArea = page.locator('textarea, input[placeholder*="标题"], .title-input').first()
      await titleArea.waitFor({ timeout: 10000 })
      await titleArea.click()
      await titleArea.fill(content.title)

      // 4. 填入正文
      const editorArea = page.locator('.editor-pane textarea, .CodeMirror textarea, textarea[class*="editor"], [class*="editor"] textarea').first()
      await editorArea.waitFor({ timeout: 10000 })
      await editorArea.click()
      await page.keyboard.press('Control+a')
      await page.keyboard.press('Backspace')
      await page.waitForTimeout(300)
      await page.keyboard.type(content.bodyMarkdown || content.body, { delay: 2 })

      // 5. 填入标签
      if (content.tags.length > 0) {
        try {
          const tagInput = page.locator('input[placeholder*="标签"]').first()
          if (await tagInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            for (const tag of content.tags.slice(0, 5)) {
              await tagInput.fill(tag)
              await page.keyboard.press('Enter')
              await page.waitForTimeout(400)
            }
          }
        } catch { /* 标签非必需 */ }
      }

      await page.waitForTimeout(1000)

      // 6. 点击发布
      const publishBtn = page.locator('button:has-text("发布文章"), button:has-text("发布"), .publish-btn').first()
      await publishBtn.waitFor({ timeout: 10000 })
      await publishBtn.click()

      // 7. 等待发布完成
      await page.waitForTimeout(5000)
      const finalUrl = page.url()

      await browser.close()

      return {
        success: true,
        platform: PlatformType.CSDN,
        url: finalUrl.includes('article') ? finalUrl : undefined,
        message: finalUrl.includes('article') ? `发布成功！${finalUrl}` : '发布完成',
      }
    } catch (err: any) {
      if (browser) try { await browser.close() } catch {}
      return { success: false, platform: PlatformType.CSDN, message: `发布异常: ${err.message}` }
    }
  }

  async openLogin(): Promise<void> {
    const { chromium } = await import('playwright')
    // 打开登录窗口，用户在 Chrome 中完成登录后 Cookie 被持久化
    const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
      headless: false,
      executablePath: CHROME_PATH,
      viewport: { width: 1280, height: 900 },
      args: BasePublisher.CHROME_ARGS,
    })
    await browser.pages()[0]
    console.log('CSDN 登录窗口已打开，请在 Chrome 中完成登录')
  }
}

export const csdnPublisher = new CSDNPublisher()
