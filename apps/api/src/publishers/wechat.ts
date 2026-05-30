/**
 * 微信公众号 Publisher — Playwright 全自动发布
 *
 * 策略：打开编辑器 → 如果需要登录等用户扫码 → 填入 → 保存
 * 失败时保持浏览器打开，用户可手动完成。
 */
import { PlatformType } from '@multipost/shared'
import type { PlatformContent } from '@multipost/shared'
import path from 'path'
import os from 'os'
import { BasePublisher, type PublishResult } from './base.js'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const USER_DATA_DIR = path.join(os.homedir(), '.multipost', 'chrome-wechat')
const EDITOR_URL = 'https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=10&lang=zh_CN'

export class WeChatPublisher extends BasePublisher {
  readonly platformType = PlatformType.WECHAT_MP

  async publish(content: PlatformContent): Promise<PublishResult> {
    const { chromium } = await import('playwright')
    let browser: any = null

    try {
      browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
        headless: false,
        executablePath: CHROME_PATH,
        viewport: { width: 1280, height: 900 },
      })

      // 使用 launcher 已创建的 page，不再 newPage()
      const pages = browser.pages()
      const page = pages[0]

      // 1. 直接导航到编辑器
      await page.goto(EDITOR_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(3000)

      // 2. 如果被重定向到登录页，等待用户扫码
      const needsLogin = page.url().includes('login') || page.url().includes('qrconnect')
      if (needsLogin) {
        console.log('🔄 请在浏览器中扫码登录公众号')
        // 一直等到 login 相关关键词消失（最多等 3 分钟，已含 60s 缓冲）
        const ok = await this.waitForLogin(page, ['login', 'qrconnect'], 60)
        if (!ok) {
          // 超时了但浏览器保持打开
          return { success: false, platform: PlatformType.WECHAT_MP, message: '扫码登录超时，请关闭浏览器后重试' }
        }
        // 登录成功，重新导航到编辑器
        console.log('✅ 登录检测成功，跳转编辑器...')
        await page.goto(EDITOR_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
        await page.waitForTimeout(4000)
      }

      // 3. 确认已到达编辑器
      if (page.url().includes('login') || page.url().includes('qrconnect')) {
        // 保留浏览器，不做二次关闭
        return { success: false, platform: PlatformType.WECHAT_MP, message: '登录未生效，请确认扫码成功后重试' }
      }

      // 4. 填入标题
      let titleOk = false
      for (const sel of ['#title', 'input[placeholder*="标题"]', '[id*="title"] input', '#title_textarea']) {
        try {
          const el = page.locator(sel).first()
          await el.waitFor({ timeout: 5000 })
          await el.click()
          await el.fill(content.title)
          titleOk = true
          break
        } catch { continue }
      }

      // 5. 填入正文
      let bodyOk = false
      for (const sel of ['#ueditor_0', '[contenteditable="true"]', '.rich_media_content']) {
        try {
          const el = page.locator(sel).first()
          await el.waitFor({ timeout: 5000 })
          await el.click()
          await page.keyboard.type(content.body, { delay: 2 })
          bodyOk = true
          break
        } catch { continue }
      }

      // 6. 点保存
      let saved = false
      if (titleOk && bodyOk) {
        for (const sel of ['button:has-text("保存")', '.js_submit', '#js_save', '[id*="save"]']) {
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

      // 浏览器保持打开让用户确认
      if (titleOk && bodyOk && saved) {
        return { success: true, platform: PlatformType.WECHAT_MP, message: '公众号图文已保存！请在浏览器中确认并预览/群发' }
      }
      if (titleOk && bodyOk) {
        return { success: true, platform: PlatformType.WECHAT_MP, message: '内容已填入，请在浏览器中手动点击保存' }
      }
      return {
        success: false,
        platform: PlatformType.WECHAT_MP,
        message: `部分填入失败（标题:${titleOk ? '✅' : '❌'} 正文:${bodyOk ? '✅' : '❌'}），请手动完成`,
      }

    } catch (err: any) {
      if (browser) try { await browser.close() } catch {}
      return { success: false, platform: PlatformType.WECHAT_MP, message: `公众号异常: ${err.message}` }
    }
  }
}

export const wechatPublisher = new WeChatPublisher()
