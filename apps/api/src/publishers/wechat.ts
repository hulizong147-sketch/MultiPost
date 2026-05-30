/**
 * 微信公众号 Publisher — Playwright 全自动发布
 *
 * 由于无法在实际公众号后台验证 DOM，采用多种策略顺序尝试。
 * 失败时截图保存到桌面，方便排查。
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
      const page = browser.pages()[0]

      // 1. 打开后台
      await page.goto('https://mp.weixin.qq.com/', { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForTimeout(3000)

      // 2. 登录
      if (page.url().includes('login') || page.url().includes('qrconnect')) {
        const ok = await this.waitForLogin(page, ['login', 'qrconnect'], 60)
        if (!ok) return { success: false, platform: PlatformType.WECHAT_MP, message: '登录超时' }
        await page.waitForTimeout(8000) // 等 dashboard 完全加载
      }

      // 3. 尝试多种方式创建图文
      let enteredEditor = false

      // 策略 A: Playwright getByText
      const textPatterns = ['新的创作', '图文消息', '写图文', '新建', '创作']
      for (const t of textPatterns) {
        try {
          const btn = page.getByText(t, { exact: true }).first()
          if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await btn.click()
            await page.waitForTimeout(2000)
            // 如果弹出了子菜单，再点「图文消息」
            const sub = page.getByText('图文消息', { exact: true }).first()
            if (await sub.isVisible({ timeout: 1500 }).catch(() => false)) {
              await sub.click()
            }
            await page.waitForTimeout(5000)
            enteredEditor = true
            break
          }
        } catch { continue }
      }

      // 策略 B: JS 遍历 DOM（宽匹配）
      if (!enteredEditor) {
        enteredEditor = await page.evaluate((): boolean => {
          const keywords = ['新的创作', '图文消息', '写图文', '新建消息']
          const all = document.querySelectorAll('*')
          for (const el of all) {
            const t = (el.textContent || '').trim()
            for (const kw of keywords) {
              if (t === kw || t.startsWith(kw)) {
                try { (el as HTMLElement).click(); return true } catch { continue }
              }
            }
          }
          return false
        })
        await page.waitForTimeout(4000)
      }

      // 策略 C: 直接 URL
      if (!enteredEditor) {
        await page.goto(
          'https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=10&lang=zh_CN',
          { waitUntil: 'networkidle', timeout: 20000 }
        )
        await page.waitForTimeout(5000)
        enteredEditor = !page.url().includes('login')
      }

      // 4. 截图（无论成败，方便调试）
      try {
        const ssDir = path.join(os.homedir(), 'Desktop')
        await page.screenshot({ path: path.join(ssDir, 'wechat-publish.png'), fullPage: false })
        console.log(`📸 截图已保存: ${ssDir}\\wechat-publish.png`)
      } catch {}

      // 5. 填入标题
      let titleOk = false
      for (const sel of ['#title', 'input[maxlength]', '[placeholder*="标题"]', '#title_textarea']) {
        try {
          const el = page.locator(sel).first()
          await el.waitFor({ timeout: 4000 })
          await el.click()
          await el.fill(content.title)
          titleOk = true
          break
        } catch { continue }
      }

      // 6. 填入正文
      let bodyOk = false
      for (const sel of ['[contenteditable="true"]', '#ueditor_0', '.rich_media_content']) {
        try {
          const el = page.locator(sel).first()
          await el.waitFor({ timeout: 4000 })
          await el.click()
          await page.keyboard.type(content.body, { delay: 2 })
          bodyOk = true
          break
        } catch { continue }
      }

      // 7. 保存
      let saved = false
      if (titleOk && bodyOk) {
        for (const sel of ['button:has-text("保存")', '[id*="save"]']) {
          try {
            const btn = page.locator(sel).first()
            await btn.waitFor({ timeout: 4000 })
            await btn.click()
            saved = true
            break
          } catch { continue }
        }
        await page.waitForTimeout(2000)
      }

      if (titleOk && bodyOk && saved) return { success: true, platform: PlatformType.WECHAT_MP, message: '公众号图文已保存！' }
      if (titleOk && bodyOk) return { success: true, platform: PlatformType.WECHAT_MP, message: '内容已填入，请手动保存' }
      return {
        success: false, platform: PlatformType.WECHAT_MP,
        message: `部分失败（进入编辑器:${enteredEditor ? '✅' : '❌'} 标题:${titleOk ? '✅' : '❌'} 正文:${bodyOk ? '✅' : '❌'}），截图已保存到桌面`,
      }
    } catch (err: any) {
      if (browser) try { await browser.close() } catch {}
      return { success: false, platform: PlatformType.WECHAT_MP, message: `异常: ${err.message}` }
    }
  }
}

export const wechatPublisher = new WeChatPublisher()
