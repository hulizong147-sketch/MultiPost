/**
 * 微信公众号 Publisher — 全部使用 F12 验证的选择器
 *
 * 选择器来源：公众号后台实际 DOM（2026-05-31）
 */
import { PlatformType } from '@multipost/shared'
import type { PlatformContent } from '@multipost/shared'
import path from 'path'
import os from 'os'
import { BasePublisher, type PublishResult } from './base.js'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const UDD = path.join(os.homedir(), '.multipost', 'chrome-wechat')

// DOM 选择器 — F12 实测
const SEL = {
  newArticle: '#app > div.main_bd_new > div:nth-child(3) > div.weui-desktop-panel__bd > div > div:nth-child(2)',
  title: '#js_title_main div',
  author: '#author',
  bodyFrame: '#ueditor_0',
  save: '#js_submit > button',
}

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

      // 1. 打开后台首页
      await page.goto('https://mp.weixin.qq.com/', { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForTimeout(4000)

      // 2. 登录检测
      if (page.url().includes('login') || page.url().includes('qrconnect')) {
        const ok = await this.waitForLogin(page, ['login', 'qrconnect'], 60)
        if (!ok) return { success: false, platform: PlatformType.WECHAT_MP, message: '登录超时' }
        await page.waitForTimeout(5000)
      }

      // 3. 截图
      await page.screenshot({ path: path.join(os.homedir(), 'Desktop', 'wechat-publish.png') }).catch(() => {})

      // 4. 点击「新建图文」进入编辑器
      let inEditor = false
      try {
        const btn = page.locator(SEL.newArticle)
        await btn.waitFor({ timeout: 10000 })
        await btn.click()
        await page.waitForTimeout(5000)
        inEditor = true
      } catch {
        // 兜底：直接跳 URL
        await page.goto(
          'https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=10&lang=zh_CN',
          { waitUntil: 'networkidle', timeout: 20000 }
        )
        await page.waitForTimeout(5000)
        inEditor = !page.url().includes('login')
      }

      // 5. 填入标题
      try {
        const el = page.locator(SEL.title).first()
        await el.waitFor({ timeout: 8000 })
        await el.click()
        await page.keyboard.press('Control+a')
        await page.waitForTimeout(200)
        await el.type(content.title, { delay: 10 })
      } catch {}

      // 6. 填入正文 — 公众号正文在 #ueditor_0 iframe 内
      try {
        const fh = page.locator(SEL.bodyFrame)
        await fh.waitFor({ timeout: 8000 })
        const frame = await fh.contentFrame()
        if (frame) {
          const area = frame.locator('[contenteditable="true"], body').first()
          await area.waitFor({ timeout: 5000 })
          await area.click()
          await frame.keyboard.press('Control+a')
          await frame.waitForTimeout(300)
          await area.type(content.body, { delay: 2 })
        }
      } catch {}

      // 7. 填入作者（公众号默认作者是公众号名，可选覆盖）
      try {
        const ael = page.locator(SEL.author)
        await ael.waitFor({ timeout: 3000 })
        await ael.fill(content.title.slice(0, 8))
      } catch {}

      // 8. 保存
      try {
        const sbtn = page.locator(SEL.save)
        await sbtn.waitFor({ timeout: 5000 })
        await sbtn.click()
        await page.waitForTimeout(2000)
      } catch {}

      return { success: true, platform: PlatformType.WECHAT_MP, message: '公众号操作完成，请检查浏览器' }
    } catch (err: any) {
      return { success: false, platform: PlatformType.WECHAT_MP, message: `异常: ${err.message}` }
    }
  }
}

export const wechatPublisher = new WeChatPublisher()
