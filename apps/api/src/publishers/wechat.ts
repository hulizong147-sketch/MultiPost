/**
 * 微信公众号 Publisher — Playwright 全自动发布
 *
 * 策略：
 * 1. 打开公众号后台
 * 2. 如需登录，等用户扫码
 * 3. 登录后点击「新的创作」→「图文消息」进入编辑器
 * 4. 填入标题和正文 → 保存
 */
import { PlatformType } from '@multipost/shared'
import type { PlatformContent } from '@multipost/shared'
import path from 'path'
import os from 'os'
import { BasePublisher, type PublishResult } from './base.js'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const USER_DATA_DIR = path.join(os.homedir(), '.multipost', 'chrome-wechat')

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
        args: BasePublisher.CHROME_ARGS,
      })
      const page = browser.pages()[0]

      // 1. 打开公众号后台首页
      await page.goto('https://mp.weixin.qq.com/', { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(4000)

      // 2. 如果需要登录，等待用户扫码
      if (page.url().includes('login') || page.url().includes('qrconnect')) {
        const ok = await this.waitForLogin(page, ['login', 'qrconnect'], 60)
        if (!ok) {
          return { success: false, platform: PlatformType.WECHAT_MP, message: '扫码登录超时' }
        }
        // 登录后页面可能已跳转，重新等待稳定
        await page.waitForTimeout(5000)
      }

      // 3. 点击「新的创作」或「新建图文消息」进入编辑器
      let enteredEditor = false
      const enterSelectors = [
        'a:has-text("新的创作"), button:has-text("新的创作")',
        'a:has-text("图文消息"), button:has-text("图文消息")',
        'a:has-text("新建图文"), button:has-text("新建图文")',
        'a:has-text("写图文"), button:has-text("写图文")',
        '.weui-desktop-create-menu__list a, .create_menu a',
        '[class*="create"] a',
      ]
      for (const sel of enterSelectors) {
        try {
          const el = page.locator(sel).first()
          await el.waitFor({ timeout: 8000 })
          await el.click()
          enteredEditor = true
          break
        } catch { continue }
      }

      // 如果以上都不行，尝试直接 URL
      if (!enteredEditor) {
        await page.goto('https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=10&lang=zh_CN', {
          waitUntil: 'domcontentloaded', timeout: 20000,
        })
      }

      await page.waitForTimeout(5000)

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
      for (const sel of ['#ueditor_0', '[contenteditable="true"]', '.rich_media_content', '.editor_content_placeholder + *']) {
        try {
          const el = page.locator(sel).first()
          await el.waitFor({ timeout: 5000 })
          await el.click()
          await page.keyboard.type(content.body, { delay: 2 })
          bodyOk = true
          break
        } catch { continue }
      }

      // 6. 保存
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

      if (titleOk && bodyOk && saved) {
        return { success: true, platform: PlatformType.WECHAT_MP, message: '公众号图文已保存！请确认并群发' }
      }
      if (titleOk && bodyOk) {
        return { success: true, platform: PlatformType.WECHAT_MP, message: '内容已填入，请在浏览器中点保存' }
      }
      return {
        success: false, platform: PlatformType.WECHAT_MP,
        message: `部分失败（标题:${titleOk ? '✅' : '❌'} 正文:${bodyOk ? '✅' : '❌'} 进入编辑器:${enteredEditor ? '✅' : '❌'}），请手动完成`,
      }
    } catch (err: any) {
      if (browser) try { await browser.close() } catch {}
      return { success: false, platform: PlatformType.WECHAT_MP, message: `公众号异常: ${err.message}` }
    }
  }
}

export const wechatPublisher = new WeChatPublisher()
