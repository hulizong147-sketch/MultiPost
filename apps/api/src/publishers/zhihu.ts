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

      // 填入正文 — 先复制到剪贴板再 Ctrl+V
      const bodyEl = page.locator('.public-DraftEditor-content').first()
      await bodyEl.waitFor({ timeout: 10000 })
      await bodyEl.click()
      await page.waitForTimeout(500)
      // 用隐藏 div 复制 HTML 到剪贴板
      await page.evaluate((html: string) => {
        const div = document.createElement('div')
        div.contentEditable = 'true'
        div.innerHTML = html
        div.style.cssText = 'position:fixed;left:-9999px;top:-9999px'
        document.body.appendChild(div)
        div.focus()
        document.execCommand('selectAll')
        document.execCommand('copy')
        document.body.removeChild(div)
      }, content.body)
      await page.waitForTimeout(300)
      // 点回正文并 Ctrl+V
      await bodyEl.click()
      await page.keyboard.press('Control+v')
      await page.waitForTimeout(2000)

      // 封面 — 滚到封面区域，上传项目图片
      try {
        const imgDir = path.join(os.homedir(), '.multipost', 'images')
        const files = fs.readdirSync(imgDir).filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f))
        if (files.length > 0) {
          const fp = path.join(imgDir, files[0])
          // 滚动到底部找封面
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
          await page.waitForTimeout(1000)
          // 用用户提供的选择器
          const sel = '#root > div > main > div > div.WriteIndexLayout-main > div.WriteIndexMain > div > div.PostEditor-wrapper > div.css-13mrzb0 > div.css-mfq34p > div > div > label > input'
          const coverInput = page.locator(sel).first()
          if (await coverInput.count() > 0) {
            await coverInput.setInputFiles(fp, { timeout: 5000 })
          } else {
            // fallback: 找包含封面的 label 里的 input[file]
            await page.locator('label:has-text("封面") input[type="file"], input[type="file"]').first().setInputFiles(fp, { timeout: 5000 })
          }
          await page.waitForTimeout(2000)
        }
      } catch {}

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
