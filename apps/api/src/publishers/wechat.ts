/**
 * 微信公众号 Publisher — Playwright 全自动发布
 *
 * 策略：
 * 1. 打开后台首页 → 等用户登录（如果未登）
 * 2. 用 JS 搜 DOM 文字，点「新的创作」→「图文消息」进编辑器
 * 3. 填入标题正文 → 保存
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

      // 1. 后台首页
      await page.goto('https://mp.weixin.qq.com/', { waitUntil: 'networkidle', timeout: 30000 })
      await page.waitForTimeout(2000)

      // 2. 登录检测
      if (page.url().includes('login') || page.url().includes('qrconnect')) {
        const ok = await this.waitForLogin(page, ['login', 'qrconnect'], 60)
        if (!ok) return { success: false, platform: PlatformType.WECHAT_MP, message: '登录超时' }
        await page.waitForTimeout(5000)
      }

      // 3. 用 JS 在 DOM 里搜「新的创作」或「图文消息」点击
      const clicked = await page.evaluate((): boolean => {
        // 收集页面上所有可见的链接/按钮/带点击事件的元素
        const all = document.querySelectorAll('a, button, span, div, li')
        for (const el of all) {
          const t = (el.textContent || '').trim()
          // 匹配"新的创作"、"图文消息"、"写图文"、"新建"
          if (t === '新的创作' || t === '图文消息' || t === '写图文' || t === '新建') {
            (el as HTMLElement).click()
            return true
          }
        }
        // 没找到精确匹配，尝试模糊匹配
        for (const el of all) {
          const t = (el.textContent || '').trim()
          if (t.includes('图文') || t.includes('创作')) {
            (el as HTMLElement).click()
            return true
          }
        }
        return false
      })

      if (clicked) {
        // 等待菜单或页面展开
        await page.waitForTimeout(2000)
        // 如果弹出下拉菜单（如"图文消息"在"新的创作"的子菜单里），再点一次
        await page.evaluate((): void => {
          const all = document.querySelectorAll('a, span, li, div')
          for (const el of all) {
            const t = (el.textContent || '').trim()
            if (t === '图文消息' || t === '写图文') {
              (el as HTMLElement).click()
              return
            }
          }
        })
        await page.waitForTimeout(5000)
      } else {
        // 兜底：直接 URL
        await page.goto(
          'https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=10&lang=zh_CN',
          { waitUntil: 'domcontentloaded', timeout: 20000 }
        )
        await page.waitForTimeout(5000)
      }

      // 4. 填入标题
      let titleOk = false
      for (const sel of ['#title', '[id*="title"] input', 'input[maxlength]', '#title_textarea']) {
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

      // 6. 保存
      let saved = false
      if (titleOk && bodyOk) {
        for (const sel of ['button:has-text("保存")', '[id*="save"]', '.js_submit']) {
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

      if (titleOk && bodyOk && saved) return { success: true, platform: PlatformType.WECHAT_MP, message: '公众号图文已保存！' }
      if (titleOk && bodyOk) return { success: true, platform: PlatformType.WECHAT_MP, message: '内容已填入，请手动点击保存' }
      return {
        success: false, platform: PlatformType.WECHAT_MP,
        message: `部分失败（进入编辑器:${clicked ? '✅' : '❌'} 标题:${titleOk ? '✅' : '❌'} 正文:${bodyOk ? '✅' : '❌'}），请手动完成`,
      }
    } catch (err: any) {
      if (browser) try { await browser.close() } catch {}
      return { success: false, platform: PlatformType.WECHAT_MP, message: `异常: ${err.message}` }
    }
  }
}

export const wechatPublisher = new WeChatPublisher()
