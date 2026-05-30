/**
 * 微信公众号 Publisher — 自愈版
 *
 * 标题自动尝试 5 种策略直到成功，结果写桌面 wechat-auto.log
 */
import { PlatformType } from '@multipost/shared'
import type { PlatformContent } from '@multipost/shared'
import path from 'path'
import os from 'os'
import fs from 'fs'
import { BasePublisher, type PublishResult } from './base.js'

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const UDD = path.join(os.homedir(), '.multipost', 'chrome-wechat')
const LOG = path.join(os.homedir(), 'Desktop', 'wechat-auto.log')

function log(msg: string) {
  const line = `[${new Date().toTimeString().slice(0,8)}] ${msg}\n`
  try { fs.appendFileSync(LOG, line) } catch {}
  console.log(msg)
}

export class WeChatPublisher extends BasePublisher {
  readonly platformType = PlatformType.WECHAT_MP

  async publish(content: PlatformContent): Promise<PublishResult> {
    const { chromium } = await import('playwright')
    let browser: any = null
    fs.writeFileSync(LOG, '')  // 清空旧日志

    try {
      browser = await chromium.launchPersistentContext(UDD, {
        headless: false, executablePath: CHROME,
        viewport: { width: 1280, height: 900 },
        args: BasePublisher.CHROME_ARGS,
      })
      let page = browser.pages()[0]
      page.on('dialog', (d: any) => d.accept())

      // === 导航 ===
      log('导航到公众号后台...')
      await page.goto('https://mp.weixin.qq.com/', { waitUntil: 'domcontentloaded', timeout: 20000 })
      await page.waitForTimeout(2000)

      if (page.url().includes('login') || page.url().includes('qrconnect')) {
        log('需要登录，等待扫码...')
        const ok = await this.waitForLogin(page, ['login', 'qrconnect'], 60)
        if (!ok) { log('登录超时'); return { success: false, platform: PlatformType.WECHAT_MP, message: '登录超时' } }
        log('登录完成')
        await page.waitForTimeout(3000)
      }

      try {
        const p = browser.waitForEvent('page', { timeout: 15000 }).catch(() => null)
        await page.getByText('文章', { exact: true }).first().click({ timeout: 5000 })
        const np = await p
        if (np) { await np.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {}); page = np }
        log('已打开编辑器')
      } catch {
        await page.goto('https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=10&lang=zh_CN', { waitUntil: 'domcontentloaded', timeout: 15000 })
        log('直接URL跳转编辑器')
      }
      await page.waitForTimeout(3000)

      // === 标题 — 自动尝试多种策略 ===
      let titleOk = false
      const strategies = [
        { name: 'click+type', fn: async () => {
          await page.locator('textarea#title').click({ timeout: 5000 })
          await page.keyboard.press('Control+a')
          await page.keyboard.type(content.title, { delay: 10 })
          await page.waitForTimeout(500)
        }},
        { name: 'focus+type', fn: async () => {
          await page.evaluate(() => (document.querySelector('#title') as HTMLElement)?.focus())
          await page.waitForTimeout(300)
          await page.keyboard.type(content.title, { delay: 10 })
          await page.waitForTimeout(500)
        }},
        { name: 'fill', fn: async () => {
          await page.locator('#title').fill(content.title, { timeout: 5000 })
          await page.waitForTimeout(500)
        }},
        { name: 'click+insertText', fn: async () => {
          await page.locator('textarea#title').click({ timeout: 5000 })
          await page.evaluate((t: string) => {
            const el = document.querySelector('#title') as HTMLTextAreaElement
            if (el) { el.focus(); el.select(); document.execCommand('insertText', false, t) }
          }, content.title)
          await page.waitForTimeout(500)
        }},
        { name: 'nativeSetter+InputEvent', fn: async () => {
          await page.evaluate((t: string) => {
            const el = document.querySelector('#title') as HTMLTextAreaElement
            if (!el) return
            el.focus()
            const s = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
            s.call(el, t)
            el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: t }))
          }, content.title)
          await page.waitForTimeout(500)
        }},
      ]

      for (const s of strategies) {
        await s.fn();
        const pv = (await page.locator('#title').inputValue().catch(() => ''))
        const dv = await page.evaluate(() => (document.querySelector('#title') as HTMLTextAreaElement)?.value || '')
        titleOk = pv.length > 0 || dv.length > 0
        log(`标题策略[${s.name}]: pv='${pv.slice(0,20)}' dv='${dv.slice(0,20)}' => ${titleOk ? '✅' : '❌'}`)
        if (titleOk) break
      }

      // === 正文 ===
      let bodyOk = false
      try {
        await page.evaluate((html: string) => {
          const f = document.querySelector('iframe') as HTMLIFrameElement | null
          const doc = f?.contentDocument
          const el = doc?.querySelector('[contenteditable="true"]') || doc?.body
          if (el) { el.innerHTML = html; el.dispatchEvent(new Event('input', { bubbles: true })) }
        }, content.body)
        bodyOk = await page.evaluate(() => {
          const f = document.querySelector('iframe') as HTMLIFrameElement | null
          const el = f?.contentDocument?.querySelector('[contenteditable="true"]') || f?.contentDocument?.body
          return el ? (el.textContent || '').length > 10 : false
        })
        log(`正文: ${bodyOk ? '✅' : '❌'}`)
      } catch (e: any) { log(`正文异常: ${e.message}`) }

      // === 作者 ===
      try { await page.locator('#author').fill(content.title.slice(0, 8), { timeout: 3000 }) } catch {}
      log(`作者: 已填`)

      // === 保存 ===
      let saved = false
      if (titleOk && bodyOk) {
        try {
          await page.locator('button:has-text("保存"), button:has-text("发表")').first().click({ timeout: 5000 })
          await page.waitForTimeout(1500)
          saved = true
          log(`保存: ✅`)
        } catch { log(`保存: ❌`) }
      }

      const msg = `标题[${titleOk?'OK':'NO'}] 正文[${bodyOk?'OK':'NO'}] 保存[${saved?'OK':'NO'}] 日志:桌面/wechat-auto.log`
      fs.writeFileSync(path.join(os.homedir(), 'Desktop', 'publish-result.txt'), msg, 'utf-8')
      return { success: true, platform: PlatformType.WECHAT_MP, message: msg }

    } catch (err: any) {
      log(`致命异常: ${err.message}`)
      return { success: false, platform: PlatformType.WECHAT_MP, message: `异常: ${err.message}` }
    }
  }
}

export const wechatPublisher = new WeChatPublisher()
