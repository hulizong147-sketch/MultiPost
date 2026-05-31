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
    let log = '' // 诊断日志

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

      // 登录
      if (page.url().includes('login') || page.url().includes('signin')) {
        console.log('🔄 请在浏览器中登录小红书...')
        const loggedIn = await this.waitForLogin(page, ['login', 'signin'], 120)
        if (!loggedIn) {
          fs.writeFileSync(path.join(os.homedir(), 'Desktop', 'xhs-log.txt'), log + 'LOGIN_TIMEOUT', 'utf-8')
          await browser.close()
          return { success: false, platform: PlatformType.XIAOHONGSHU, message: '小红书登录超时' }
        }
        await page.goto(EDITOR_URL, { waitUntil: 'domcontentloaded', timeout: 20000 })
        await page.waitForTimeout(3000)
      }
      log += 'LOGIN '

      // 切换图文模式
      try {
        const imgTextSel = '#web > div > div > div > div.header > div.header-tabs > div:nth-child(5)'
        await page.locator(imgTextSel).click({ timeout: 5000 })
        log += 'TAB '
        await page.waitForTimeout(1000)
      } catch (e: any) { log += 'TAB_ERR:' + (e.message||'').slice(0,30) + ' ' }

      // 标题
      try {
        const t = page.locator('input[placeholder*="标题"], [class*="title"] input').first()
        await t.waitFor({ timeout: 10000 })
        await t.fill(content.title.slice(0, 20))
        log += 'TITLE '
      } catch (e: any) { log += 'TITLE_ERR:' + (e.message||'').slice(0,30) + ' ' }

      // 正文 — 找到 contenteditable 并 Ctrl+V
      try {
        const el = page.locator('[contenteditable="true"]').first()
        await el.waitFor({ timeout: 10000 })
        await el.click()
        await page.waitForTimeout(500)
        // 复制到剪贴板
        await page.evaluate((html: string) => {
          const div = document.createElement('div')
          div.contentEditable = 'true'; div.innerHTML = html
          div.style.cssText = 'position:fixed;left:-9999px'
          document.body.appendChild(div)
          div.focus(); document.execCommand('selectAll'); document.execCommand('copy')
          document.body.removeChild(div)
        }, content.body)
        await page.waitForTimeout(300)
        await el.click()
        await page.keyboard.press('Control+v')
        log += 'BODY '
        await page.waitForTimeout(2000)
      } catch (e: any) { log += 'BODY_ERR:' + (e.message||'').slice(0,30) + ' ' }

      // 封面图 — 上传项目图片
      try {
        const imgDir = path.join(os.homedir(), '.multipost', 'images')
        const files = fs.readdirSync(imgDir).filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f))
        if (files.length > 0) {
          // 滚到底部
          await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
          await page.waitForTimeout(1000)
          await page.locator('input[type="file"]').first().setInputFiles(path.join(imgDir, files[0]), { timeout: 5000 })
          log += 'COVER '
          await page.waitForTimeout(2000)
        }
      } catch (e: any) { log += 'COVER_ERR:' + (e.message||'').slice(0,30) + ' ' }

      // 发布
      try {
        const btn = page.locator('button:has-text("发布"), button:has-text("发表")').first()
        await btn.waitFor({ timeout: 10000 })
        await btn.click()
        log += 'PUB '
        await page.waitForTimeout(3000)
        // 确认弹窗
        try { await page.locator('button:has-text("确定"), button:has-text("确认")').first().click({ timeout: 5000 }); log += 'CONFIRM ' } catch {}
      } catch (e: any) { log += 'PUB_ERR:' + (e.message||'').slice(0,30) + ' ' }

      await page.waitForTimeout(3000)
      const finalUrl = page.url()
      await browser.close()
      log += 'DONE URL=' + finalUrl.slice(0, 60)

      fs.writeFileSync(path.join(os.homedir(), 'Desktop', 'xhs-log.txt'), log, 'utf-8')
      return { success: true, platform: PlatformType.XIAOHONGSHU, url: finalUrl, message: '小红书发布完成' }
    } catch (err: any) {
      fs.writeFileSync(path.join(os.homedir(), 'Desktop', 'xhs-log.txt'), log + ' FATAL:' + (err.message||'').slice(0,80), 'utf-8')
      return { success: false, platform: PlatformType.XIAOHONGSHU, message: `小红书异常: ${err.message}` }
    }
  }
}

export const xiaohongshuPublisher = new XiaohongshuPublisher()
