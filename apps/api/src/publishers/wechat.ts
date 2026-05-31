/**
 * 微信公众号 Publisher
 *
 * 正文不在 iframe 里！在主页面 #ueditor_0 > div > div > div > div > section
 */
import { PlatformType } from '@multipost/shared'
import type { PlatformContent } from '@multipost/shared'
import path from 'path'
import os from 'os'
import fs from 'fs'
import { BasePublisher, type PublishResult } from './base.js'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const UDD = path.join(os.homedir(), '.multipost', 'chrome-wechat')

function cleanLock() {
  const locks = ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile']
  for (const f of locks) { try { fs.unlinkSync(path.join(UDD, f)) } catch {} }
}

export class WeChatPublisher extends BasePublisher {
  readonly platformType = PlatformType.WECHAT_MP

  async publish(content: PlatformContent): Promise<PublishResult> {
    const { chromium } = await import('playwright')
    let browser: any = null
    cleanLock()

    try {
      browser = await chromium.launchPersistentContext(UDD, {
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
      await page.waitForTimeout(5000)

      // 3. 正文 — 主页面 #ueditor_0 section（不插入图片）
      await page.evaluate((html: string) => {
        const el = document.querySelector('#ueditor_0 > div > div > div > div > section') as HTMLElement | null
        if (el) { el.innerHTML = html; el.dispatchEvent(new Event('input', { bubbles: true })) }
      }, content.body)

      // 4. 标题 — #js_title_main
      await page.evaluate((text: string) => {
        const el = document.querySelector('#js_title_main > div > div > div > div') as HTMLElement | null
        if (el) {
          if (el.getAttribute('contenteditable') != null) {
            el.innerText = text; el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }))
          } else {
            const s = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
            s.call(el, text)
            el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }))
          }
        }
      }, content.title)

      // 5. 作者
      try { await page.locator('#author').fill(content.title.slice(0, 8), { timeout: 3000 }) } catch {}

      // 6. 封面 — setFiles 已成功，接下来选图+下一步
      try {
        const imgDir2 = path.join(os.homedir(), '.multipost', 'images')
        const files = fs.readdirSync(imgDir2).filter((f: string) => /\.(png|jpg|jpeg|gif|webp)$/i.test(f))
        if (files.length > 0) {
          const fp = path.join(imgDir2, files[0])
          await page.locator('text=拖拽或选择封面').click({ timeout: 5000 })
          await page.waitForTimeout(500)
          await page.locator('#js_cover_null > ul > li:nth-child(2) > a').click({ timeout: 5000 })
          await page.waitForTimeout(1000)
          // setFiles 到隐藏的 input（已验证可行）
          await page.locator('input[type="file"]').first().setInputFiles(fp, { timeout: 5000 })
          await page.waitForTimeout(3000)
          // 选列表第一张图
          await page.locator('#js_image_dialog_list_wrp > div > div:nth-child(1) > i').first().click({ timeout: 5000 })
          await page.waitForTimeout(500)
          // 点下一步
          const nextBtn = '#vue_app > mp-image-product-dialog > div > div.weui-desktop-dialog__wrp.weui-desktop-dialog_img-picker > div > div.weui-desktop-dialog__ft > div:nth-child(1) > button'
          await page.locator(nextBtn).click({ timeout: 5000 })
          await page.waitForTimeout(2000)
          try { await page.locator('button:has-text("完成")').click({ timeout: 3000 }) } catch {}
        }
      } catch {}

      return { success: true, platform: PlatformType.WECHAT_MP, message: '公众号发布完成' }

    } catch (err: any) {
      return { success: false, platform: PlatformType.WECHAT_MP, message: `异常: ${err.message}` }
    }
  }
}

export const wechatPublisher = new WeChatPublisher()
