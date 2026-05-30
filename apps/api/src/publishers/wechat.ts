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
  title: '#js_title_main > div > div > div > div',
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
        await page.waitForTimeout(8000)  // 编辑器加载需要时间
        inEditor = true
      } catch {
        await page.goto(
          'https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=10&lang=zh_CN',
          { waitUntil: 'networkidle', timeout: 20000 }
        )
        await page.waitForTimeout(8000)
        inEditor = !page.url().includes('login')
      }

      // 再等一会确保 React 组件和 iframe 完全渲染
      await page.waitForTimeout(3000)

      // 5. 填入标题
      let titleOk = false, titleErr = ''
      try {
        const el = page.locator(SEL.title).first()
        await el.waitFor({ timeout: 10000 })
        await el.click()
        await el.fill(content.title)
        titleOk = true
      } catch (e: any) { titleErr = e.message.split('\n')[0] }

      // 6. 填入正文 — 公众号正文在 #ueditor_0 iframe 内
      let bodyOk = false, bodyErr = ''
      try {
        const fh = page.locator(SEL.bodyFrame)
        await fh.waitFor({ timeout: 10000 })
        await page.waitForTimeout(2000)
        const frame = await fh.contentFrame()
        if (frame) {
          const area = frame.locator('[contenteditable="true"], body').first()
          await area.waitFor({ timeout: 5000 })
          await area.click()
          await area.type(content.body, { delay: 2 })
          bodyOk = true
        } else { bodyErr = 'iframe内容获取失败' }
      } catch (e: any) { bodyErr = e.message.split('\n')[0] }

      // 7. 填入作者
      let authorOk = false, authorErr = ''
      try {
        const ael = page.locator(SEL.author)
        await ael.waitFor({ timeout: 5000 })
        await ael.click()
        await ael.fill(content.title.slice(0, 8))
        authorOk = true
      } catch (e: any) { authorErr = e.message.split('\n')[0] }

      // 8. 保存
      let saved = false, saveErr = ''
      try {
        const sbtn = page.locator(SEL.save)
        await sbtn.waitFor({ timeout: 5000 })
        await sbtn.click()
        await page.waitForTimeout(2000)
        saved = true
      } catch (e: any) { saveErr = e.message.split('\n')[0] }

      let msg = `标题:${titleOk ? '✅' : '❌'} 正文:${bodyOk ? '✅' : '❌'} 作者:${authorOk ? '✅' : '❌'} 保存:${saved ? '✅' : '❌'}`
      if (!titleOk) msg += ` | 标题:${titleErr}`
      if (!bodyOk) msg += ` | 正文:${bodyErr}`
      if (!authorOk) msg += ` | 作者:${authorErr}`
      if (!saved) msg += ` | 保存:${saveErr}`
      msg += '。请检查浏览器'
      return { success: true, platform: PlatformType.WECHAT_MP, message: msg }
    } catch (err: any) {
      return { success: false, platform: PlatformType.WECHAT_MP, message: `异常: ${err.message}` }
    }
  }
}

export const wechatPublisher = new WeChatPublisher()
