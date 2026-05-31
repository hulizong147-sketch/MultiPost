/**
 * 小红书 Publisher — 图文模式自动发布
 */
import { PlatformType } from '@multipost/shared'
import type { PlatformContent } from '@multipost/shared'
import path from 'path'
import os from 'os'
import fs from 'fs'
import { BasePublisher, type PublishResult } from './base.js'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const USER_DATA_DIR = path.join(os.homedir(), '.multipost', 'chrome-xiaohongshu')
const EDITOR_URL = 'https://creator.xiaohongshu.com/publish/publish'

export class XiaohongshuPublisher extends BasePublisher {
  readonly platformType = PlatformType.XIAOHONGSHU

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

      if (page.url().includes('login') || page.url().includes('signin')) {
        console.log('\u{1F504} 请在浏览器中登录小红书...')
        const loggedIn = await this.waitForLogin(page, ['login', 'signin'], 120)
        if (!loggedIn) {
          fs.writeFileSync(path.join(os.homedir(), 'Desktop', 'xhs-log.txt'), log + 'LOGIN_TIMEOUT', 'utf-8')
          await browser.close()
          return { success: false, platform: PlatformType.XIAOHONGSHU, message: '登录超时' }
        }
        await page.goto(EDITOR_URL, { waitUntil: 'domcontentloaded', timeout: 20000 })
        await page.waitForTimeout(3000)
      }
      log += 'LOGIN '

      // 切换图文模式
      try {
        const tab = '#web > div > div > div > div.header > div.header-tabs > div:nth-child(5)'
        await page.locator(tab).click({ timeout: 5000 })
        log += 'TAB '
        await page.waitForTimeout(1000)
      } catch (e: any) { log += 'TAB_ERR:' + (e.message||'').slice(0,20) + ' ' }

      // 封面 — 直接用 setInputFiles 到隐藏 input，不点上传区
      try {
        const imgDir = path.join(os.homedir(), '.multipost', 'images')
        const files = fs.readdirSync(imgDir).filter((f: string) => /\.(png|jpg|jpeg|gif|webp)$/i.test(f))
        if (files.length > 0) {
          const fp = path.join(imgDir, files[0])
          // 不点击，直接用 setInputFiles
          await page.locator('input[type="file"]').first().setInputFiles(fp, { timeout: 5000 })
          log += 'COVER '
          await page.waitForTimeout(2000)
        }
      } catch (e: any) { log += 'COV_ERR:' + (e.message||'').slice(0,20) + ' ' }

      // 标题
      try {
        const t = page.locator('input[placeholder*="标题"], [class*="title"] input').first()
        await t.waitFor({ timeout: 10000 })
        await t.fill(content.title.slice(0, 20))
        log += 'TITLE '
      } catch (e: any) { log += 'TIT_ERR:' + (e.message||'').slice(0,20) + ' ' }

      // 正文 — 纯文本，用 keyboard.type
      try {
        const el = page.locator('[contenteditable="true"]').first()
        await el.waitFor({ timeout: 10000 })
        await el.click()
        await page.keyboard.type(content.body, { delay: 1 })
        log += 'BODY '
        await page.waitForTimeout(1000)
      } catch (e: any) { log += 'BOD_ERR:' + (e.message||'').slice(0,20) + ' ' }

      // 发布
      try {
        const btn = page.locator('button:has-text("发布"), button:has-text("发表")').first()
        await btn.waitFor({ timeout: 10000 })
        await btn.click()
        log += 'PUB '
        await page.waitForTimeout(3000)
        try { await page.locator('button:has-text("确定"), button:has-text("确认")').first().click({ timeout: 5000 }); log += 'CONFIRM ' } catch {}
      } catch (e: any) { log += 'PUB_ERR:' + (e.message||'').slice(0,20) + ' ' }

      await page.waitForTimeout(3000)
      const url = page.url()
      await browser.close()
      log += 'DONE'

      fs.writeFileSync(path.join(os.homedir(), 'Desktop', 'xhs-log.txt'), log, 'utf-8')
      return { success: true, platform: PlatformType.XIAOHONGSHU, url, message: '发布完成' }
    } catch (err: any) {
      fs.writeFileSync(path.join(os.homedir(), 'Desktop', 'xhs-log.txt'), log + ' FATAL:' + (err.message||'').slice(0,80), 'utf-8')
      return { success: false, platform: PlatformType.XIAOHONGSHU, message: `异常: ${err.message}` }
    }
  }
}

export const xiaohongshuPublisher = new XiaohongshuPublisher()
