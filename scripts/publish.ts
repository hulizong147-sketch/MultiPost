/**
 * MultiPost 自动发布 CLI
 *
 * 用法（在你的 Windows 终端里执行）：
 *   cd D:\MultiPost
 *   npx tsx scripts/publish.ts --platform csdn --file ./article.md
 *   或
 *   pnpm publish:csdn -- ./article.md
 *
 * 注意：此脚本脱离 WorkBuddy 沙箱，直接在你的电脑上运行，
 * 使用 Playwright 控制本地 Chrome 实现全自动发布。
 */

import { chromium } from 'playwright'
import path from 'path'
import os from 'os'
import fs from 'fs'

// ====== 配置 ======
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const USER_DATA_DIR = path.join(os.homedir(), '.multipost', 'chrome-csdn')

// ====== CSDN 自动发布 ======
async function publishToCSDN(markdown: string, title: string) {
  console.log('🚀 启动 Chrome...')
  const browser = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    executablePath: CHROME_PATH,
    viewport: { width: 1280, height: 900 },
  })

  const page = await browser.newPage()

  try {
    // 1. 打开 CSDN 编辑器
    console.log('📝 打开 CSDN 编辑器...')
    await page.goto('https://editor.csdn.net/md?not_checkout=1', {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    })

    // 2. 检测登录
    await page.waitForTimeout(3000)
    const url = page.url()
    if (url.includes('passport') || url.includes('login')) {
      console.log('⚠️  未登录 CSDN，请在打开的 Chrome 窗口中手动登录')
      console.log('   登录完成后按 Enter 继续...')
      await waitForEnter()
      await page.goto('https://editor.csdn.net/md?not_checkout=1', {
        waitUntil: 'domcontentloaded',
        timeout: 20000,
      })
      await page.waitForTimeout(2000)
    }

    // 3. 填入标题
    console.log('📌 填入标题...')
    const titleArea = page.locator('textarea, input[placeholder*="标题"], .title-input').first()
    await titleArea.waitFor({ timeout: 10000 })
    await titleArea.click()
    await titleArea.fill(title)

    // 4. 填入正文（CSDN Markdown 编辑器直接用 keyboard 输入）
    console.log('📄 填入正文...')
    // 找到 Markdown 编辑区
    const editorArea = page.locator('.editor-pane textarea, .CodeMirror textarea, #editor textarea, [class*="editor"] textarea').first()
    await editorArea.waitFor({ timeout: 10000 })
    await editorArea.click()
    // 清空默认内容
    await page.keyboard.press('Control+a')
    await page.keyboard.press('Backspace')
    await page.waitForTimeout(300)
    // 逐字输入（模拟真实操作，避开反自动化检测）
    await page.keyboard.type(markdown, { delay: 2 })
    console.log(`   ✅ 已输入 ${markdown.length} 字符`)

    await page.waitForTimeout(1000)

    // 5. 点击发布
    console.log('🚀 点击发布...')
    const publishBtn = page.locator('button:has-text("发布文章"), button:has-text("发布"), .publish-btn').first()
    await publishBtn.waitFor({ timeout: 10000 })
    await publishBtn.click()

    // 6. 等待发布完成
    await page.waitForTimeout(5000)

    const finalUrl = page.url()
    console.log(`\n✅ 发布完成！`)
    if (finalUrl.includes('article')) {
      console.log(`   🔗 文章链接: ${finalUrl}`)
    } else {
      console.log(`   请检查浏览器窗口确认发布状态`)
    }

  } catch (err: any) {
    console.error(`❌ 发布失败: ${err.message}`)
    console.log('   Chrome 窗口将保持打开，可手动完成发布')
  }

  // 不关闭浏览器，让用户确认
  console.log('\n按 Enter 关闭浏览器...')
  await waitForEnter()
  await browser.close()
  console.log('👋 完成')
}

// ====== 工具函数 ======
function waitForEnter(): Promise<void> {
  return new Promise((resolve) => {
    process.stdin.once('data', () => resolve())
    process.stdin.resume()
  })
}

function parseArgs() {
  const args = process.argv.slice(2)
  const opts: { platform?: string; file?: string; title?: string } = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--platform' && args[i + 1]) opts.platform = args[++i]
    else if (args[i] === '--file' && args[i + 1]) opts.file = args[++i]
    else if (args[i] === '--title' && args[i + 1]) opts.title = args[++i]
    else if (!args[i].startsWith('--')) opts.file = args[i]
  }
  return opts
}

function extractTitle(md: string): string {
  const match = md.match(/^#\s+(.+)$/m)
  return match ? match[1].trim() : '未命名'
}

// ====== 入口 ======
async function main() {
  const opts = parseArgs()

  if (!opts.file) {
    console.log('用法: npx tsx scripts/publish.ts [--platform csdn] --file ./article.md [--title "标题"]')
    console.log('      pnpm publish:csdn -- ./article.md')
    process.exit(1)
  }

  const filePath = path.resolve(opts.file)
  if (!fs.existsSync(filePath)) {
    console.error(`❌ 文件不存在: ${filePath}`)
    process.exit(1)
  }

  const markdown = fs.readFileSync(filePath, 'utf-8')
  const title = opts.title || extractTitle(markdown)

  console.log(`📋 文章: ${title}`)
  console.log(`📏 长度: ${markdown.length} 字符`)
  console.log(`🎯 平台: ${opts.platform || 'csdn'}`)
  console.log('')

  const platform = opts.platform || 'csdn'

  if (platform === 'csdn') {
    await publishToCSDN(markdown, title)
  } else {
    console.error(`❌ 不支持的平台: ${platform}，目前仅支持 csdn`)
    process.exit(1)
  }
}

main().catch(console.error)
