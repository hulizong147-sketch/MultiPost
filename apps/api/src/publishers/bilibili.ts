/**
 * B站专栏 Publisher — Playwright 全自动发布
 *
 * B站专栏编辑器: https://member.bilibili.com/v2#/upload-manager/article
 * 主编编辑器: https://member.bilibili.com/platform/upload/text/edit
 *
 * B站专栏支持富文本，适配器已输出 HTML + inline style。
 */
import { PlatformType } from '@multipost/shared'
import type { PlatformContent } from '@multipost/shared'
import path from 'path'
import os from 'os'
import { BasePublisher, type PublishResult } from './base.js'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const USER_DATA_DIR = path.join(os.homedir(), '.multipost', 'chrome-bilibili')
const EDITOR_URL = 'https://member.bilibili.com/platform/upload/text/edit'

export class BilibiliPublisher extends BasePublisher {
  readonly platformType = PlatformType.BILIBILI

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

      // 1. 打开 B站专栏编辑器
      await page.goto(EDITOR_URL, { waitUntil: 'domcontentloaded', timeout: 20000 })
      await page.waitForTimeout(3000)

      // 2. 检测登录
      if (page.url().includes('passport') || page.url().includes('login')) {
        await browser.close()
        return { success: false, platform: PlatformType.BILIBILI, message: 'B站未登录。请先登录 B站 后重试。' }
      }

      // 3. 填入标题
      const titleSel = 'input[placeholder*="标题"], .title-input input, #title'
      const titleEl = page.locator(titleSel).first()
      await titleEl.waitFor({ timeout: 10000 })
      await titleEl.click()
      await titleEl.fill(content.title)

      // 4. 填入正文（B站专栏支持富文本编辑器）
      // 尝试多种编辑区选择器
      const bodySels = [
        '[contenteditable="true"]',
        '.ql-editor',
        '.editor-content',
        '.article-editor [contenteditable]',
      ]
      let bodyFilled = false
      for (const sel of bodySels) {
        try {
          const el = page.locator(sel).first()
          await el.waitFor({ timeout: 3000 })
          await el.click()
          // 用 innerHTML 注入（B站适配器输出的是 HTML）
          await page.evaluate((s: string, html: string) => {
            const el = document.querySelector(s)
            if (el) (el as HTMLElement).innerHTML = html
          }, sel, content.body)
          bodyFilled = true
          break
        } catch { continue }
      }
      if (!bodyFilled) {
        await browser.close()
        return { success: false, platform: PlatformType.BILIBILI, message: '未找到 B站正文编辑区，页面结构可能已变更' }
      }

      // 5. 填入标签
      if (content.tags.length > 0) {
        try {
          const tagInput = page.locator('input[placeholder*="标签"], input[placeholder*="tag"]').first()
          if (await tagInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            for (const tag of content.tags.slice(0, 5)) {
              await tagInput.fill(tag)
              await page.keyboard.press('Enter')
              await page.waitForTimeout(300)
            }
          }
        } catch { /* 标签非必需 */ }
      }

      await page.waitForTimeout(1000)

      // 6. 点击发布
      const publishBtn = page.locator(
        'button:has-text("发布"), button:has-text("提交"), button:has-text("发表"), .publish-btn, .submit-btn'
      ).first()
      await publishBtn.waitFor({ timeout: 10000 })
      await publishBtn.click()

      await page.waitForTimeout(5000)
      const finalUrl = page.url()
      await browser.close()

      return {
        success: true,
        platform: PlatformType.BILIBILI,
        url: finalUrl,
        message: finalUrl.includes('article') || finalUrl.includes('read') ? `发布成功！${finalUrl}` : '发布完成，请到 B站 确认',
      }
    } catch (err: any) {
      if (browser) try { await browser.close() } catch {}
      return { success: false, platform: PlatformType.BILIBILI, message: `B站发布异常: ${err.message}` }
    }
  }
}

export const bilibiliPublisher = new BilibiliPublisher()
