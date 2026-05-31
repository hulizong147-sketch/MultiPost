/**
 * 知乎 Publisher — 完整版带诊断
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
    let log = ''

    try {
      browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
        headless: false, executablePath: CHROME_PATH,
        viewport: { width: 1280, height: 900 },
        args: BasePublisher.CHROME_ARGS,
      })
      const page = browser.pages()[0]

      await page.goto(EDITOR_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(3000)
      log += 'NAV '

      if (page.url().includes('signin') || page.url().includes('login')) {
        console.log('🔄 请在浏览器中登录知乎...')
        const loggedIn = await this.waitForLogin(page, ['signin', 'login'], 120)
        if (!loggedIn) {
          fs.writeFileSync(path.join(os.homedir(), 'Desktop', 'zhihu-log.txt'), log + 'LOGIN_TIMEOUT', 'utf-8')
          await browser.close()
          return { success: false, platform: PlatformType.ZHIHU, message: '知乎登录超时' }
        }
        await page.goto(EDITOR_URL, { waitUntil: 'domcontentloaded', timeout: 20000 })
        await page.waitForTimeout(3000)
      }
      log += 'LOGIN '

      // 标题
      try {
        const t = page.locator('.WriteIndex-titleInput input, [placeholder*="标题"]').first()
        await t.waitFor({ timeout: 10000 })
        await t.fill(content.title)
        log += 'TITLE '
      } catch (e: any) { log += 'TIT_ERR:' + (e.message||'').slice(0,25) + ' ' }

      // 正文 — Ctrl+V
      try {
        const el = page.locator('.public-DraftEditor-content').first()
        await el.waitFor({ timeout: 10000 })
        await el.click()
        await page.waitForTimeout(500)
        // 复制 HTML
        await page.evaluate((html: string) => {
          const d = document.createElement('div'); d.contentEditable = 'true'; d.innerHTML = html
          d.style.cssText = 'position:fixed;left:-9999px'
          document.body.appendChild(d); d.focus()
          document.execCommand('selectAll'); document.execCommand('copy')
          document.body.removeChild(d)
        }, content.body)
        await page.waitForTimeout(300)
        await el.click()
        await page.keyboard.press('Control+v')
        await page.waitForTimeout(2000)
        // 检查字数
        const charCount = await page.evaluate(() => {
          const el = document.querySelector('.public-DraftEditor-content')
          return (el as HTMLElement)?.innerText?.length || 0
        })
        log += 'BODY chars=' + charCount + ' '
      } catch (e: any) { log += 'BOD_ERR:' + (e.message||'').slice(0,25) + ' ' }

      // 封面
      try {
        const imgDir = path.join(os.homedir(), '.multipost', 'images')
        const files = fs.readdirSync(imgDir).filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f))
        if (files.length > 0) {
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
          await page.waitForTimeout(1000)
          await page.locator('input[type="file"]').first().setInputFiles(path.join(imgDir, files[0]), { timeout: 5000 })
          log += 'COVER '
          await page.waitForTimeout(2000)
        }
      } catch (e: any) { log += 'COV_ERR:' + (e.message||'').slice(0,25) + ' ' }

      // 发布
      try {
        const btn = page.locator('button:has-text("发布"), button:has-text("发表")').first()
        await btn.waitFor({ timeout: 10000 })
        await btn.click()
        log += 'PUB '
        await page.waitForTimeout(3000)
        try { await page.locator('button:has-text("确认发布"), button:has-text("确定")').first().click({ timeout: 5000 }); log += 'CONFIRM ' } catch {}
      } catch (e: any) { log += 'PUB_ERR:' + (e.message||'').slice(0,25) + ' ' }

      await page.waitForTimeout(3000)
      const url = page.url()
      await browser.close()
      log += 'DONE'

      fs.writeFileSync(path.join(os.homedir(), 'Desktop', 'zhihu-log.txt'), log, 'utf-8')
      return { success: true, platform: PlatformType.ZHIHU, url, message: '知乎发布完成' }
    } catch (err: any) {
      fs.writeFileSync(path.join(os.homedir(), 'Desktop', 'zhihu-log.txt'), log + ' FATAL:' + (err.message||'').slice(0,80), 'utf-8')
      return { success: false, platform: PlatformType.ZHIHU, message: `知乎异常: ${err.message}` }
    }
  }
}

export const zhihuPublisher = new ZhihuPublisher()
