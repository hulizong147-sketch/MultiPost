/**
 * B站专栏 Publisher — v6 标题+封面修复版
 *
 * 修复：
 *   1. 标题：textarea.title-input__inner，用原生 setter + dispatchEvent 设值
 *   2. 封面：开关和上传区都在 iframe 内，先点"发布设置"展开面板
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

      // ========== 5. 填充标题（在 iframe 内，textarea.title-input__inner）==========
      try {
        // 标题是 textarea，fill() 可能不触发 Vue 绑定，用 evaluate 直接设值
        let titleDone = false
        try {
          await editorFrame.evaluate((text: string) => {
            const el = document.querySelector('.title-input__inner') as HTMLTextAreaElement | null
            if (el) {
              // 用原生 setter 设值 + 触发 input/change 事件
              const nativeSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
              nativeSetter!.call(el, text)
              el.dispatchEvent(new Event('input', { bubbles: true }))
              el.dispatchEvent(new Event('change', { bubbles: true }))
            }
          }, content.title || '')
          titleDone = true
          log += 'TITLE_TEXTAREA '
        } catch {}

        if (!titleDone) {
          // 兜底：fill 方式
          try {
            await editorFrame.locator('.title-input__inner').first().fill(content.title || '', { timeout: 3000 })
            titleDone = true
            log += 'TITLE_FILL '
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

          // 正文（封面不放这里了，放右边自定义封面区）
          const bodyHtml = content.body || ''
          await editorFrame.evaluate((html: string) => {
            (window as any).editor.commands.insertContent(html)
          }, bodyHtml)
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

              // 正文用 ClipboardEvent 粘贴（封面不放正文里了）
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

      // ========== 6.5 封面上传（在 iframe 内，不在主页面）==========
      // 封面开关和上传区都在 iframe 的右侧"发布设置"面板里
      try {
        const imgDir = path.join(os.homedir(), '.multipost', 'images')
        if (fs.existsSync(imgDir)) {
          const files = fs.readdirSync(imgDir).filter(f => /\.(png|jpg|jpeg|gif|webp)$/i.test(f))
          if (files.length > 0) {
            const imgPath = path.join(imgDir, files[0])

            // Step 1: 点击 iframe 内"发布设置"按钮（展开右侧面板）
            try {
              const settingsBtn = editorFrame.locator('button:has-text("发布设置")').first()
              if (await settingsBtn.isVisible({ timeout: 3000 })) {
                await settingsBtn.click()
                log += 'SETTINGS_OPEN '
                await page.waitForTimeout(1000)
              }
            } catch { log += 'SETTINGS_NONE ' }

            // Step 2: 打开"自定义封面"开关（用户提供的 selector，在 iframe 内）
            const switchSels = [
              '#app > div.body > div.main > div:nth-child(4) > div > div.form > div:nth-child(2) > div > div.form-item-center > div.vui_switch--switch > div',
              '[class*="vui_switch"] > div',
              '[class*="switch"]',
            ]
            let switched = false
            for (const sel of switchSels) {
              try {
                const sw = editorFrame.locator(sel).first()
                if (await sw.isVisible({ timeout: 2000 })) {
                  await sw.click()
                  switched = true
                  log += 'SWITCH[' + sel.slice(0, 35) + '] '
                  break
                }
              } catch {}
            }
            if (!switched) log += 'SWITCH_NONE '
            await page.waitForTimeout(1000)

            // Step 3: 点"添加封面"按钮 + filechooser 拦截上传
            const addSels = ['text=添加封面', 'text=上传封面', 'text=选择图片']
            let uploaded = false
            for (const sel of addSels) {
              try {
                const btn = editorFrame.locator(sel).first()
                if (await btn.isVisible({ timeout: 2000 })) {
                  const [fc] = await Promise.all([
                    page.waitForEvent('filechooser', { timeout: 8000 }),
                    btn.click()
                  ])
                  await fc.setFiles(imgPath)
                  uploaded = true
                  log += 'COVER[' + sel.slice(0, 15) + '] '
                  break
                }
              } catch {}
            }
            if (!uploaded) {
              // 兜底：直接 setInputFiles
              try {
                await editorFrame.locator('input[type="file"]').first().setInputFiles(imgPath, { timeout: 5000 })
                log += 'COVER_FI '
              } catch { log += 'COVER_NONE ' }
            }
            await page.waitForTimeout(3000)

            // Step 4: 裁剪弹窗点"确定"
            try {
              // 裁剪弹窗可能在 iframe 内
              const confirmBtn = editorFrame.locator('button:has-text("确定"), button:has-text("确认"), button:has-text("完成")').first()
              if (await confirmBtn.isVisible({ timeout: 3000 })) {
                await confirmBtn.click()
                log += 'CROP_CONFIRM '
                await page.waitForTimeout(2000)
              }
            } catch { log += 'NO_CROP ' }
          }
        }
      } catch (e: any) { log += 'COVER_UP_ERR:' + (e.message || '').slice(0, 30) + ' ' }

      // 不自动发布，留给用户手动点击
      log += 'READY_MANUAL_PUBLISH '

      fs.writeFileSync(path.join(os.homedir(), 'Desktop', 'bili-log.txt'), log, 'utf-8')
      return { success: true, platform: PlatformType.BILIBILI, url: page.url(), message: '内容已填充，请手动发布' }

    } catch (err: any) {
      fs.writeFileSync(path.join(os.homedir(), 'Desktop', 'bili-log.txt'),
        log + ' FATAL:' + (err.message || '').slice(0, 150), 'utf-8')
      if (browser) { try { await browser.close() } catch {} }
      return { success: false, platform: PlatformType.BILIBILI, message: '异常: ' + (err.message || '').slice(0, 100) }
    }
  }
}

export const bilibiliPublisher = new BilibiliPublisher()
