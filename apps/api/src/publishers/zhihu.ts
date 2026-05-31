/**
 * 知乎 Publisher — Playwright 全自动发布
 *
 * 知乎创作中心: https://zhuanlan.zhihu.com/write
 * 知乎文章编辑器支持类 Markdown 格式。
 */
import { PlatformType } from '@multipost/shared'
import type { PlatformContent } from '@multipost/shared'
import path from 'path'
import os from 'os'
import fs from 'fs'
import { BasePublisher, type PublishResult } from './base.js'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const USER_DATA_DIR = path.join(os.homedir(), '.multipost', 'chrome-zhihu')
const EDITOR_URL = 'https://zhuanlan.zhihu.com/write'

export class ZhihuPublisher extends BasePublisher {
  readonly platformType = PlatformType.ZHIHU

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

      if (page.url().includes('signin') || page.url().includes('login')) {
        console.log('🔄 请在浏览器中登录知乎...')
        const loggedIn = await this.waitForLogin(page, ['signin', 'login'])
        if (!loggedIn) {
          await browser.close()
          return { success: false, platform: PlatformType.ZHIHU, message: '知乎登录超时（3分钟），请重试' }
        }
        await page.goto(EDITOR_URL, { waitUntil: 'domcontentloaded', timeout: 20000 })
        await page.waitForTimeout(2000)
      }

      // 填入标题
      const titleSel = '.WriteIndex-titleInput input, .title-input textarea, [placeholder*="标题"]'
      try {
        const t = page.locator(titleSel).first()
        await t.waitFor({ timeout: 10000 })
        await t.click()
        await t.fill(content.title)
      } catch {}

      // 填入正文 — public-DraftEditor-content（已验证存在）
      const bodyEl = page.locator('.public-DraftEditor-content').first()
      await bodyEl.waitFor({ timeout: 10000 })
      await bodyEl.click()
      await page.evaluate((html: string) => {
        const el = document.querySelector('.public-DraftEditor-content') as HTMLElement
        if (el) { el.innerHTML = html; el.dispatchEvent(new Event('input', { bubbles: true })) }
      }, content.body)
      await page.waitForTimeout(1000)
      await page.waitForTimeout(1000)

      // 点击发布
      const publishBtn = page.locator(
        'button:has-text("发布"), button:has-text("发表"), .publish-btn, [class*="publish"] button'
      ).first()
      await publishBtn.waitFor({ timeout: 10000 })
      await publishBtn.click()
      await page.waitForTimeout(3000)

      // 发布确认弹窗 — 可能有「确认发布」「确定」按钮
      try {
        const confirmSel = 'button:has-text("确认发布"), button:has-text("确定"), button:has-text("发布"), .publish-confirm button'
        const confirm = page.locator(confirmSel).first()
        await confirm.waitFor({ timeout: 8000 })
        await confirm.click()
        await page.waitForTimeout(3000)
      } catch { /* 没有确认弹窗就继续 */ }

      await page.waitForTimeout(5000)
      const finalUrl = page.url()
      await browser.close()

      return {
        success: true,
        platform: PlatformType.ZHIHU,
        url: finalUrl,
        message: finalUrl.includes('zhuanlan') && finalUrl.includes('p/') ? `发布成功！${finalUrl}` : '发布完成，请到知乎确认',
      }
    } catch (err: any) {
            return { success: false, platform: PlatformType.ZHIHU, message: `知乎发布异常: ${err.message}` }
    }
  }
}

export const zhihuPublisher = new ZhihuPublisher()
