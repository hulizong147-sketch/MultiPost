/**
 * 微信公众号 Publisher
 */
import { PlatformType } from '@multipost/shared'
import type { PlatformContent } from '@multipost/shared'
import path from 'path'
import os from 'os'
import { BasePublisher, type PublishResult } from './base.js'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const UDD = path.join(os.homedir(), '.multipost', 'chrome-wechat')

export class WeChatPublisher extends BasePublisher {
  readonly platformType = PlatformType.WECHAT_MP

  async publish(content: PlatformContent): Promise<PublishResult> {
    const { chromium } = await import('playwright')
    let browser: any = null

    try {
      browser = await chromium.launchPersistentContext(UDD, {
        headless: false, executablePath: CHROME,
        viewport: { width: 1280, height: 900 },
        args: BasePublisher.CHROME_ARGS,
      })
      let page = browser.pages()[0]

      // 1. 后台首页
      await page.goto('https://mp.weixin.qq.com/', { waitUntil: 'domcontentloaded', timeout: 20000 })
      await page.waitForTimeout(2000)

      // 2. 登录
      if (page.url().includes('login') || page.url().includes('qrconnect')) {
        const ok = await this.waitForLogin(page, ['login', 'qrconnect'], 60)
        if (!ok) return { success: false, platform: PlatformType.WECHAT_MP, message: '登录超时' }
        await page.waitForTimeout(3000)
      }

      // 3. 点击「文章」
      try {
        const newPageProm = browser.waitForEvent('page', { timeout: 15000 }).catch(() => null)
        await page.getByText('文章', { exact: true }).first().click({ timeout: 5000 })
        const np = await newPageProm
        if (np) { await np.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {}); page = np }
        await page.waitForTimeout(2000)
      } catch {
        await page.goto('https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=10&lang=zh_CN', { waitUntil: 'domcontentloaded', timeout: 15000 })
        await page.waitForTimeout(3000)
      }

      let titleOk = false, bodyOk = false, saved = false

      // 4. 标题
      try { await page.locator('#title').fill(content.title, { timeout: 5000 }); titleOk = true } catch {}

      // 5. 正文（iframe）
      try {
        const frame = await page.locator('iframe').first().contentFrame({ timeout: 5000 })
        if (frame) { await frame.locator('[contenteditable="true"], body').first().fill(content.body, { timeout: 5000 }); bodyOk = true }
      } catch {}

      // 6. 作者
      try { await page.locator('#author').fill(content.title.slice(0, 8), { timeout: 3000 }) } catch {}

      // 7. 保存
      try { await page.locator('button:has-text("保存"), button:has-text("发表")').first().click({ timeout: 5000 }); await page.waitForTimeout(1000); saved = true } catch {}

      return { success: true, platform: PlatformType.WECHAT_MP, message: `标题:${titleOk?'✅':'❌'} 正文:${bodyOk?'✅':'❌'} 保存:${saved?'✅':'❌'}` }
    } catch (err: any) {
      return { success: false, platform: PlatformType.WECHAT_MP, message: `异常: ${err.message}` }
    }
  }
}

export const wechatPublisher = new WeChatPublisher()
