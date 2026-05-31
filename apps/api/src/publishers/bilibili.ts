/**
 * B站专栏 Publisher — v4 iframe 切换版
 *
 * 诊断结果（v3）：
 *   IFRAMES[1] = member.bilibili.com/york/read-editor?  ← 编辑器 iframe
 *   INPUTS = []  → 主页面没有任何 input
 *   BUTTONS = [] → 主页面没有任何 button
 *   EDITOR_INFO = {} → 主页面没有任何编辑器元素
 *
 * 结论：标题、正文、发布按钮全部在 read-editor iframe 里！
 */
import { PlatformType } from '@multipost/shared'
import type { PlatformContent } from '@multipost/shared'
import path from 'path'
import os from 'os'
import fs from 'fs'
import { BasePublisher, type PublishResult } from './base.js'

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const USER_DATA_DIR = path.join(os.homedir(), '.multipost', 'chrome-bilibili')
const EDITOR_URL = 'https://member.bilibili.com/platform/upload/text/edit'

export class BilibiliPublisher extends BasePublisher {
  readonly platformType = PlatformType.BILIBILI

  async publish(content: PlatformContent): Promise<PublishResult> {
    const { chromium } = await import('playwright')
    let browser: any = null
    let log = ''

    try {
      browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
        headless: false, executablePath: CHROME_PATH,
        viewport: { width: 1280, height: 900 },
        args: BasePublisher.CHROME_ARGS,
      })
      const page = browser.pages()[0]

      // ========== 1. 导航 ==========
      await page.goto(EDITOR_URL, { waitUntil: 'domcontentloaded', timeout: 30000 })
      await page.waitForTimeout(4000)
      log += 'NAV '

      // ========== 2. 登录 ==========
      if (page.url().includes('passport') || page.url().includes('login')) {
        const loggedIn = await this.waitForLogin(page, ['passport', 'login'], 120)
        if (!loggedIn) {
          fs.writeFileSync(path.join(os.homedir(), 'Desktop', 'bili-log.txt'), log + 'LOGIN_TIMEOUT', 'utf-8')
          await browser.close()
          return { success: false, platform: PlatformType.BILIBILI, message: '登录超时' }
        }
        await page.goto(EDITOR_URL, { waitUntil: 'domcontentloaded', timeout: 20000 })
        await page.waitForTimeout(4000)
      }
      log += 'LOGIN '

      // 截图
      await page.screenshot({ path: path.join(os.homedir(), 'Desktop', 'bili-page.png') })

      // ========== 3. 定位 read-editor iframe ==========
      const editorFrame = page.frames().find(f => f.url().includes('read-editor'))
      if (!editorFrame) {
        log += 'NO_READ_EDITOR_FRAME '
        fs.writeFileSync(path.join(os.homedir(), 'Desktop', 'bili-log.txt'), log, 'utf-8')
        await browser.close()
        return { success: false, platform: PlatformType.BILIBILI, message: '未找到 read-editor iframe' }
      }
      log += 'GOT_FRAME '

      // ========== 4. iframe 内诊断 ==========
      await page.waitForTimeout(2000)

      // Dump iframe body HTML
      try {
        const bodyText = await editorFrame.evaluate(() => document.body.innerHTML.slice(0, 8000))
        fs.writeFileSync(path.join(os.homedir(), 'Desktop', 'bili-body.txt'), bodyText, 'utf-8')
        log += 'IFRAME_BODY_SAVED '
      } catch { log += 'IFRAME_BODY_ERR ' }

      // Dump iframe 内的 inputs
      try {
        const inputs = await editorFrame.evaluate(() => {
          return Array.from(document.querySelectorAll('input, textarea, [contenteditable="true"]')).map(el => {
            const e = el as HTMLElement
            const inp = el as HTMLInputElement
            const rect = e.getBoundingClientRect()
            const visible = rect.width > 0 && rect.height > 0
            return {
              tag: e.tagName, type: inp.type || '',
              placeholder: inp.placeholder || e.getAttribute('placeholder') || '',
              id: e.id, cls: (e.className as string)?.slice(0, 60),
              visible, w: Math.round(rect.width), h: Math.round(rect.height),
              x: Math.round(rect.x), y: Math.round(rect.y),
              contenteditable: e.getAttribute('contenteditable') || ''
            }
          }).filter(el => el.visible)
        })
        log += 'IF_INPUTS[' + inputs.length + ']=' + JSON.stringify(inputs) + ' '
      } catch { log += 'IF_INPUTS_ERR ' }

      // Dump iframe 内的 buttons
      try {
        const buttons = await editorFrame.evaluate(() => {
          return Array.from(document.querySelectorAll('button, [role="button"]')).slice(0, 20).map(el => {
            const rect = el.getBoundingClientRect()
            return {
              text: (el.textContent || '').trim().slice(0, 40),
              id: el.id,
              cls: (el.className as string)?.slice(0, 60),
              visible: rect.width > 0 && rect.height > 0,
              x: Math.round(rect.x), y: Math.round(rect.y)
            }
          }).filter(b => b.visible)
        })
        log += 'IF_BUTTONS[' + buttons.length + ']=' + JSON.stringify(buttons) + ' '
      } catch { log += 'IF_BUTTONS_ERR ' }

      // 检查编辑器 API
      try {
        const editorInfo = await editorFrame.evaluate(() => {
          const w = window as any
          return {
            hasEditor: !!w.editor,
            commands: w.editor?.commands ? Object.keys(w.editor.commands).slice(0, 20) : [],
            hasProseMirror: document.querySelector('.ProseMirror') != null,
            proseMirrorCls: (document.querySelector('.ProseMirror') as HTMLElement)?.className?.slice(0, 60) || ''
          }
        })
        log += 'EDITOR=' + JSON.stringify(editorInfo) + ' '
      } catch { log += 'EDITOR_ERR ' }

      // ========== 5. 填充标题（在 iframe 内） ==========
      try {
        // 根据截图，标题 placeholder 是 "请输入标题（建议30字以内）"
        const titleSels = [
          'input[placeholder*="标题"]',
          '[placeholder*="标题"] input',
          '[placeholder*="标题"]',
          'input[type="text"]',
          'textarea[placeholder*="标题"]',
        ]
        let titleDone = false
        for (const sel of titleSels) {
          try {
            const el = editorFrame.locator(sel).first()
            if (await el.isVisible({ timeout: 2000 })) {
              await el.click()
              await el.fill('')
              await el.fill(content.title || '')
              titleDone = true
              log += 'TITLE[' + sel.slice(0, 30) + '] '
              break
            }
          } catch {}
        }

        if (!titleDone) {
          // 兜底：找 contenteditable 作为标题
          try {
            const ceditables = editorFrame.locator('[contenteditable="true"]')
            const count = await ceditables.count()
            if (count > 0) {
              // 第一个 contenteditable 可能是标题
              await ceditables.first().click()
              await ceditables.first().fill(content.title || '')
              titleDone = true
              log += 'TITLE_FIRST_EDITABLE '
            }
          } catch {}
        }
        if (!titleDone) log += 'TITLE_NONE '
      } catch (e: any) { log += 'TITLE_ERR:' + (e.message || '').slice(0, 40) + ' ' }

      // ========== 6. 填充正文 + 封面图（在 iframe 内） ==========
      try {
        // 用 window.editor API（如果可用）
        const hasEditor = await editorFrame.evaluate(() => {
          const w = window as any
          return !!(w.editor && w.editor.commands)
        })

        if (hasEditor) {
          await editorFrame.evaluate(() => {
            (window as any).editor.commands.clearContent(true)
          })
          await page.waitForTimeout(300)
          log += 'CLEARED '

          // 正文 HTML
          let insertHtml = content.body || ''

          // 封面图插在最前面
          const imgDir = path.join(os.homedir(), '.multipost', 'images')
          if (fs.existsSync(imgDir)) {
            const files = fs.readdirSync(imgDir).filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f))
            if (files.length > 0) {
              const imgPath = path.join(imgDir, files[0])
              const imgBuf = fs.readFileSync(imgPath)
              const ext = path.extname(files[0]).slice(1).toLowerCase()
              const mime = ext === 'jpg' ? 'jpeg' : ext
              const b64 = 'data:image/' + mime + ';base64,' + imgBuf.toString('base64')
              insertHtml = '<p><img src="' + b64 + '" /></p>' + insertHtml
              log += 'COVER_PREPEND '
            }
          }

          await editorFrame.evaluate((html: string) => {
            (window as any).editor.commands.insertContent(html)
          }, insertHtml)
          await page.waitForTimeout(2000)
          log += 'BODY_EDITOR '

          const len = await editorFrame.evaluate(() => {
            try { return JSON.stringify((window as any).editor.getJSON()).length } catch { return -1 }
          })
          log += 'JSON=' + len + ' '
        } else {
          // 备用：找 .ProseMirror 或 contenteditable
          try {
            const pm = editorFrame.locator('.ProseMirror').first()
            if (await pm.isVisible({ timeout: 3000 })) {
              await pm.click()
              await page.waitForTimeout(300)
              await editorFrame.evaluate(() => {
                const el = document.querySelector('.ProseMirror')
                if (el) el.innerHTML = ''
              })
              await page.waitForTimeout(200)

              // 封面图 base64 插入
              const imgDir = path.join(os.homedir(), '.multipost', 'images')
              if (fs.existsSync(imgDir)) {
                const files = fs.readdirSync(imgDir).filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f))
                if (files.length > 0) {
                  const imgPath = path.join(imgDir, files[0])
                  const imgBuf = fs.readFileSync(imgPath)
                  const ext = path.extname(files[0]).slice(1).toLowerCase()
                  const mime = ext === 'jpg' ? 'jpeg' : ext
                  const b64 = 'data:image/' + mime + ';base64,' + imgBuf.toString('base64')

                  await editorFrame.evaluate((b64: string) => {
                    const pm = document.querySelector('.ProseMirror')
                    if (pm) {
                      const img = document.createElement('img')
                      img.src = b64
                      img.style.cssText = 'max-width:100%;display:block'
                      pm.insertBefore(img, pm.firstChild)
                      const br = document.createElement('br')
                      pm.appendChild(br)
                    }
                  }, b64)
                  log += 'COVER_DOM '
                }
              }

              // 正文用 ClipboardEvent 粘贴
              await editorFrame.evaluate((html: string) => {
                const d = document.createElement('div')
                d.innerHTML = html
                d.style.cssText = 'position:fixed;left:-9999px;top:-9999px'
                document.body.appendChild(d)
                const range = document.createRange()
                range.selectNodeContents(d)
                const s = window.getSelection()
                s?.removeAllRanges()
                s?.addRange(range)
                document.execCommand('copy')
                document.body.removeChild(d)
              }, content.body || '')
              await page.waitForTimeout(200)
              await pm.click()
              // 把光标移到末尾再粘贴
              await editorFrame.evaluate(() => {
                const pm = document.querySelector('.ProseMirror')
                if (pm) {
                  const sel = window.getSelection()
                  const range = document.createRange()
                  range.selectNodeContents(pm)
                  range.collapse(false)
                  sel?.removeAllRanges()
                  sel?.addRange(range)
                }
              })
              await page.keyboard.press('Control+v')
              await page.waitForTimeout(2000)
              log += 'BODY_PM '
            } else {
              log += 'NO_PM '
            }
          } catch { log += 'BODY_ALT_ERR ' }
        }
      } catch (e: any) { log += 'BODY_ERR:' + (e.message || '').slice(0, 50) + ' ' }

      // ========== 7. 发布（在 iframe 内） ==========
      try {
        const pubSels = [
          'button:has-text("发布")',
          '[class*="publish"]',
          '[class*="submit"]',
        ]
        let pubDone = false
        for (const sel of pubSels) {
          try {
            const el = editorFrame.locator(sel).first()
            const text = await el.textContent()
            if (await el.isVisible({ timeout: 3000 }) && (text?.includes('发布') || text?.includes('提交') || text?.includes('发表'))) {
              await el.click()
              pubDone = true
              log += 'PUB[' + sel.slice(0, 25) + '] '
              break
            }
          } catch {}
        }
        if (!pubDone) {
          // 兜底：找 iframe 内文本含"发布"的可见 button
          const btns = editorFrame.locator('button')
          const count = await btns.count()
          for (let i = 0; i < count; i++) {
            const b = btns.nth(i)
            try {
              const t = await b.textContent()
              if ((t?.includes('发布') || t?.includes('发表')) && await b.isVisible()) {
                await b.click()
                log += 'PUB_BTN[' + i + '] '
                pubDone = true
                break
              }
            } catch {}
          }
        }
        if (!pubDone) log += 'PUB_NONE '

        await page.waitForTimeout(3000)
        try {
          await editorFrame.locator('button:has-text("确定"), button:has-text("确认")').first().click({ timeout: 5000 })
          log += 'CONFIRM '
        } catch { log += 'NO_CONFIRM ' }
      } catch (e: any) { log += 'PUB_ERR:' + (e.message || '').slice(0, 30) + ' ' }

      await page.waitForTimeout(3000)
      const finalUrl = page.url()
      await browser.close()
      log += 'DONE URL=' + finalUrl.slice(0, 80)

      fs.writeFileSync(path.join(os.homedir(), 'Desktop', 'bili-log.txt'), log, 'utf-8')
      return { success: true, platform: PlatformType.BILIBILI, url: finalUrl, message: '发布完成' }

    } catch (err: any) {
      fs.writeFileSync(path.join(os.homedir(), 'Desktop', 'bili-log.txt'),
        log + ' FATAL:' + (err.message || '').slice(0, 150), 'utf-8')
      if (browser) { try { await browser.close() } catch {} }
      return { success: false, platform: PlatformType.BILIBILI, message: '异常: ' + (err.message || '').slice(0, 100) }
    }
  }
}

export const bilibiliPublisher = new BilibiliPublisher()
