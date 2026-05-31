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

      // 3. 正文 — 本地图片转 base64 + 主页面 #ueditor_0 section
      // 将 HTML 中的 <img src="/images/file/xxx"> 替换为 base64 data URI
      let bodyHtml = content.body
      const IMG_RE = /<img[^>]+src="\/images\/file\/([^"]+)"/gi
      let m: RegExpExecArray | null
      while ((m = IMG_RE.exec(bodyHtml)) !== null) {
        const fp = path.join(os.homedir(), '.multipost', 'images', m[1])
        if (fs.existsSync(fp)) {
          const ext = path.extname(m[1]).toLowerCase()
          const mime: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' }
          const b64 = fs.readFileSync(fp, 'base64')
          bodyHtml = bodyHtml.replace(m[0], m[0].replace(`/images/file/${m[1]}`, `data:${mime[ext] || 'image/png'};base64,${b64}`))
        }
      }

      // 如果没有 <img>，则取存储的第一张图片做封面
      if (!/<img/i.test(bodyHtml)) {
        const imgDir = path.join(os.homedir(), '.multipost', 'images')
        try {
          const files = fs.readdirSync(imgDir).filter((f: string) => /\.(png|jpg|jpeg|gif|webp)$/i.test(f))
          if (files.length > 0) {
            const ext = path.extname(files[0]).toLowerCase()
            const mime: Record<string, string> = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp' }
            const b64 = fs.readFileSync(path.join(imgDir, files[0]), 'base64')
            bodyHtml = `<img src="data:${mime[ext] || 'image/png'};base64,${b64}" style="width:100%;max-width:900px;margin-bottom:16px"/>` + bodyHtml
          }
        } catch {}
      }

      await page.evaluate((html: string) => {
        // 如果没有图片，Canvas 生成封面
        if (!/<img/i.test(html)) {
          const c = document.createElement('canvas')
          c.width = 900; c.height = 500
          const ctx = c.getContext('2d')!
          ctx.fillStyle = '#1677ff'; ctx.fillRect(0, 0, 900, 500)
          ctx.fillStyle = '#fff'; ctx.font = 'bold 48px sans-serif'; ctx.textAlign = 'center'
          ctx.fillText(html.slice(0, 20), 450, 220)
          ctx.font = '24px sans-serif'; ctx.fillText('MultiPost', 450, 300)
          html = '<img src="'+c.toDataURL('image/png')+'" style="width:100%;max-width:900px;margin-bottom:16px"/>' + html
        }
        const el = document.querySelector('#ueditor_0 > div > div > div > div > section') as HTMLElement | null
        if (el) { el.innerHTML = html; el.dispatchEvent(new Event('input', { bubbles: true })) }
      }, bodyHtml)

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

      // 6. 封面 — 诊断模式，写每步结果
      const imgDir2 = path.join(os.homedir(), '.multipost', 'images')
      let coverLog = 'start'
      try {
        const files = fs.readdirSync(imgDir2).filter((f: string) => /\.(png|jpg|jpeg|gif|webp)$/i.test(f))
        coverLog = 'files:' + files.length
        if (files.length > 0) {
          const fp = path.join(imgDir2, files[0])
          // 1
          await page.locator('text=拖拽或选择封面').click({ timeout: 5000 })
          coverLog = '1-clicked-cover'
          await page.waitForTimeout(500)
          // 2
          await page.locator('#js_cover_null > ul > li:nth-child(2) > a').click({ timeout: 5000 })
          coverLog = '2-clicked-library'
          await page.waitForTimeout(1000)
          // 3
          await page.locator('input[type="file"]').first().setInputFiles(fp, { timeout: 5000 })
          coverLog = '3-setFiles'
          await page.waitForTimeout(2000)
          // 4. 下一步
          const nextBtn = '#vue_app > mp-image-product-dialog > div > div.weui-desktop-dialog__wrp.weui-desktop-dialog_img-picker > div > div.weui-desktop-dialog__ft > div:nth-child(1) > button'
          await page.locator(nextBtn).click({ timeout: 5000 })
          await page.waitForTimeout(2000)
          // 5. 可能还有「完成」
          try { await page.locator('button:has-text("完成")').click({ timeout: 3000 }) } catch {}
          await page.waitForTimeout(1000)
          coverLog = '4-done'
        }
      } catch (e: any) { coverLog = 'ERR:' + (e?.message||'').slice(0,60) }
      fs.writeFileSync(path.join(os.homedir(), 'Desktop', 'cover-log.txt'), coverLog, 'utf-8')

      return { success: true, platform: PlatformType.WECHAT_MP, message: '公众号发布完成' }

    } catch (err: any) {
      return { success: false, platform: PlatformType.WECHAT_MP, message: `异常: ${err.message}` }
    }
  }
}

export const wechatPublisher = new WeChatPublisher()
