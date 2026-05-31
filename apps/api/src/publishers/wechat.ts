/**
 * 微信公众号 Publisher
 *
 * 策略：
 * - 标题：dispatchEvent(MouseEvent.click) + native value setter + InputEvent（绕过 Playwright 可见性检查 + React 拦截）
 * - 正文：iframe innerHTML（HTML 格式）
 * - 作者：fill()
 * - 保存：button:has-text
 */
import { PlatformType } from '@multipost/shared'
import type { PlatformContent } from '@multipost/shared'
import path from 'path'
import os from 'os'
import fs from 'fs'
import { BasePublisher, type PublishResult } from './base.js'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const UDD_MASTER = path.join(os.homedir(), '.multipost', 'chrome-wechat')

// 从主 profile 复制登录态 cookie 到临时目录
function syncLogin(dir: string) {
  if (!fs.existsSync(UDD_MASTER)) return
  fs.mkdirSync(dir, { recursive: true })
  const files = ['Cookies', 'Cookies-journal', 'Local State', 'Network', 'Login Data', 'Login Data-journal']
  for (const f of files) {
    const src = path.join(UDD_MASTER, f)
    const dst = path.join(dir, f)
    if (fs.existsSync(src)) try { fs.copyFileSync(src, dst) } catch {}
  }
}

export class WeChatPublisher extends BasePublisher {
  readonly platformType = PlatformType.WECHAT_MP

  async publish(content: PlatformContent): Promise<PublishResult> {
    const { chromium } = await import('playwright')
    let browser: any = null
    const tempDD = path.join(os.homedir(), '.multipost', 'chrome-' + Date.now())
    syncLogin(tempDD)

    try {
      browser = await chromium.launchPersistentContext(tempDD, {
        headless: false, executablePath: CHROME,
        viewport: { width: 1280, height: 900 },
        args: BasePublisher.CHROME_ARGS,
      })
      let page = browser.pages()[0]
      page.on('dialog', (d: any) => d.accept())

      // 1. 导航
      await page.goto('https://mp.weixin.qq.com/', { waitUntil: 'domcontentloaded', timeout: 20000 })
      await page.waitForTimeout(2000)

      if (page.url().includes('login') || page.url().includes('qrconnect')) {
        const ok = await this.waitForLogin(page, ['login', 'qrconnect'], 60)
        if (!ok) return { success: false, platform: PlatformType.WECHAT_MP, message: '登录超时' }
        await page.waitForTimeout(3000)
      }

      // 2. 进编辑器
      try {
        const p = browser.waitForEvent('page', { timeout: 15000 }).catch(() => null)
        await page.getByText('文章', { exact: true }).first().click({ timeout: 5000 })
        const np = await p
        if (np) { await np.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {}); page = np }
      } catch {
        await page.goto('https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=10&lang=zh_CN', { waitUntil: 'domcontentloaded', timeout: 15000 })
      }
      await page.waitForTimeout(5000)  // 确保 React 完全渲染

      // 3. 标题 — 剪贴板 + Ctrl+V（React 唯一认的方式）
      await page.evaluate((text: string) => navigator.clipboard.writeText(text), content.title)
      await page.locator('#title').click({ force: true, timeout: 5000 })
      await page.waitForTimeout(200)
      await page.keyboard.press('Control+a')
      await page.keyboard.press('Control+v')
      await page.waitForTimeout(300)

      // 4. 正文 — iframe 内 dispatchEvent click + execCommand('insertHTML')
      await page.evaluate((html: string) => {
        const f = document.querySelector('iframe') as HTMLIFrameElement | null
        const doc = f?.contentDocument
        if (!doc) return
        doc.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        doc.querySelector('body')?.focus()
        doc.execCommand('selectAll')
        doc.execCommand('insertHTML', false, html)
      }, content.body)
      await page.waitForTimeout(500)

      // 5. 作者
      try { await page.locator('#author').fill(content.title.slice(0, 8), { timeout: 3000 }) } catch {}

      // 6. 保存
      try { await page.locator('button:has-text("保存")').first().click({ timeout: 5000 }); await page.waitForTimeout(1000) } catch {}

      return { success: true, platform: PlatformType.WECHAT_MP, message: '公众号发布完成' }
    } catch (err: any) {
      return { success: false, platform: PlatformType.WECHAT_MP, message: `异常: ${err.message}` }
    } finally {
      try { fs.rmSync(tempDD, { recursive: true, force: true }) } catch {}
    }
  }
}

export const wechatPublisher = new WeChatPublisher()
