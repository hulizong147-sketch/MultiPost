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

      // 正文 — Ctrl+A + Delete + Ctrl+V（Draft.js 认键盘粘贴）
      try {
        const el = page.locator('.public-DraftEditor-content').first()
        await el.waitFor({ timeout: 10000 })
        await el.click()
        await page.waitForTimeout(300)

        // 全选删除
        await page.keyboard.press('Control+a')
        await page.keyboard.press('Backspace')
        await page.waitForTimeout(200)

        // 把 HTML 写入隐藏 div，copy 到剪贴板
        await page.evaluate((html: string) => {
          const d = document.createElement('div')
          d.contentEditable = 'true'
          d.innerHTML = html
          d.style.cssText = 'position:fixed;left:-9999px;top:-9999px'
          document.body.appendChild(d)
          d.focus()
          document.execCommand('selectAll')
          document.execCommand('copy')
          document.body.removeChild(d)
        }, content.body || '')

        // Ctrl+V 粘贴
        await el.click()
        await page.waitForTimeout(200)
        await page.keyboard.press('Control+v')
        await page.waitForTimeout(2000)

        const charCount = await page.evaluate(() => {
          const el = document.querySelector('.public-DraftEditor-content')
          return (el as HTMLElement)?.innerText?.length || 0
        })
        log += 'BODY chars=' + charCount + ' '
      } catch (e: any) { log += 'BOD_ERR:' + (e.message||'').slice(0,25) + ' ' }

      // 封面：知乎弹窗流程太复杂，暂时跳过，用户手动设置

      // 不自动发布，留给用户手动点击
      log += 'READY_MANUAL_PUBLISH '

      fs.writeFileSync(path.join(os.homedir(), 'Desktop', 'zhihu-log.txt'), log, 'utf-8')
      return { success: true, platform: PlatformType.ZHIHU, url: page.url(), message: '内容已填充，请手动发布' }
    } catch (err: any) {
      fs.writeFileSync(path.join(os.homedir(), 'Desktop', 'zhihu-log.txt'), log + ' FATAL:' + (err.message||'').slice(0,80), 'utf-8')
      return { success: false, platform: PlatformType.ZHIHU, message: `知乎异常: ${err.message}` }
    }
  }
}

export const zhihuPublisher = new ZhihuPublisher()
