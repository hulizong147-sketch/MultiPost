/**
 * 微信公众号 Publisher — 使用真实 DOM 选择器
 *
 * 选择器来源：公众号后台 F12 实际验证
 */
import { PlatformType } from '@multipost/shared'
import type { PlatformContent } from '@multipost/shared'
import path from 'path'
import os from 'os'
import { BasePublisher, type PublishResult } from './base.js'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const UDD = path.join(os.homedir(), '.multipost', 'chrome-wechat')
const EDITOR = 'https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=10&lang=zh_CN'

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
      const page = browser.pages()[0]

      // 1. 直接打开编辑器（利用已保存的登录态）
      await page.goto(EDITOR, { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForTimeout(3000)

      // 2. 如果需要登录
      if (page.url().includes('login') || page.url().includes('qrconnect')) {
        const ok = await this.waitForLogin(page, ['login', 'qrconnect'], 60)
        if (!ok) return { success: false, platform: PlatformType.WECHAT_MP, message: '登录超时' }
        // 重新导航到编辑器
        await page.goto(EDITOR, { waitUntil: 'networkidle', timeout: 20000 })
        await page.waitForTimeout(5000)
      }

      // 3. 截图
      const ssPath = path.join(os.homedir(), 'Desktop', 'wechat-publish.png')
      await page.screenshot({ path: ssPath })

      // 4. 填入标题 — F12 验证的选择器
      const titleEl = page.locator('#js_title_main div').first()
      await titleEl.waitFor({ timeout: 10000 })
      await titleEl.click()
      // 公众号标题区域需要先清空再输入
      await page.keyboard.press('Control+a')
      await page.waitForTimeout(200)
      await titleEl.fill(content.title)

      // 5. 填入正文 — #ueditor_0 是 iframe，需要进入 iframe 上下文
      let bodyOk = false
      try {
        const frameHandle = page.locator('#ueditor_0')
        await frameHandle.waitFor({ timeout: 8000 })
        const frame = await frameHandle.contentFrame()
        if (frame) {
          const bodyArea = frame.locator('[contenteditable="true"], body').first()
          await bodyArea.waitFor({ timeout: 5000 })
          await bodyArea.click()
          await frame.keyboard.press('Control+a')
          await frame.waitForTimeout(200)
          await bodyArea.type(content.body, { delay: 2 })
          bodyOk = true
        }
      } catch { /* iframe 策略失败，降级 */ }
      if (!bodyOk) {
        // 降级：直接在页面上找 contenteditable
        try {
          const el = page.locator('[contenteditable="true"]').first()
          await el.waitFor({ timeout: 5000 })
          await el.click()
          await page.keyboard.type(content.body, { delay: 2 })
          bodyOk = true
        } catch { /* 正文填入失败 */ }
      }

      // 6. 保存
      let saved = false
      if (bodyOk) {
        for (const sel of ['#js_save', 'button:has-text("保存")', '[id*="save"] button']) {
          try {
            const btn = page.locator(sel).first()
            await btn.waitFor({ timeout: 5000 })
            await btn.click()
            saved = true
            break
          } catch { continue }
        }
        await page.waitForTimeout(2000)
      }

      if (bodyOk && saved) return { success: true, platform: PlatformType.WECHAT_MP, message: '公众号图文已保存！' }
      if (bodyOk) return { success: true, platform: PlatformType.WECHAT_MP, message: '内容已填入，请手动保存' }
      return {
        success: false, platform: PlatformType.WECHAT_MP,
        message: `标题已填、正文${bodyOk ? '已' : '未'}填入（截图: ${ssPath}），请手动完成`,
      }
    } catch (err: any) {
      if (browser) try { await browser.close() } catch {}
      return { success: false, platform: PlatformType.WECHAT_MP, message: `异常: ${err.message}` }
    }
  }
}

export const wechatPublisher = new WeChatPublisher()
