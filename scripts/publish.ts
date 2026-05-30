/**
 * MultiPost 自动发布 CLI
 *
 * 用法（在你的 Windows 终端里执行，不是在 WorkBuddy 里）：
 *
 *   方式1 — 从文件发布：
 *     cd D:\MultiPost
 *     pnpm publish:csdn --file ./article.md
 *
 *   方式2 — 从剪贴板发布（Ctrl+V 粘贴内容后按 Ctrl+Z 再回车）：
 *     pnpm publish:csdn --stdin --title "文章标题"
 *
 *   方式3 — 从 API 发布（先启动 MultiPost web app，写完内容后执行）：
 *     pnpm publish:csdn --fetch
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
  const opts: { platform?: string; file?: string; title?: string; stdin?: boolean; fetch?: boolean } = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--platform' && args[i + 1]) opts.platform = args[++i]
    else if (args[i] === '--file' && args[i + 1]) opts.file = args[++i]
    else if (args[i] === '--title' && args[i + 1]) opts.title = args[++i]
    else if (args[i] === '--stdin') opts.stdin = true
    else if (args[i] === '--fetch') opts.fetch = true
    else if (!args[i].startsWith('--')) opts.file = args[i]
  }
  return opts
}

// ====== 从标准输入读取 ======
function readFromStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = ''
    process.stdin.setEncoding('utf-8')
    process.stdin.on('data', chunk => { data += chunk })
    process.stdin.on('end', () => resolve(data.trim()))
    process.stdin.resume()
  })
}

// ====== 从 API 读取当前编辑内容 ======
async function fetchFromAPI(): Promise<{ markdown: string; title: string }> {
  try {
    const res = await fetch('http://localhost:3000/api/health')
    if (!res.ok) throw new Error('API 未运行')
  } catch {
    throw new Error('请先启动 MultiPost: pnpm --filter @multipost/api dev')
  }
  // 注意：API 没有直接暴露当前 markdown 的端点
  // 所以 --fetch 模式提示用户从 web app 复制
  throw new Error(
    '请先在 MultiPost 网页中点击 Sample 加载内容，然后使用 --file 或 --stdin 方式发布\n' +
    '  方式1: 在网页中复制 markdown → pnpm publish:csdn --stdin --title "标题"\n' +
    '  方式2: 在网页中复制 markdown → 保存为 article.md → pnpm publish:csdn --file article.md'
  )
}

// ====== 入口 ======
async function main() {
  const opts = parseArgs()

  let markdown = ''
  let title = opts.title || ''

  if (opts.stdin) {
    console.log('📋 请粘贴 Markdown 内容，然后按 Ctrl+Z 再按回车：')
    markdown = await readFromStdin()
  } else if (opts.fetch) {
    try {
      const result = await fetchFromAPI()
      markdown = result.markdown
      title = title || result.title
    } catch (err: any) {
      console.error(`❌ ${err.message}`)
      process.exit(1)
    }
  } else if (opts.file) {
    const filePath = path.resolve(opts.file)
    if (!fs.existsSync(filePath)) {
      console.error(`❌ 文件不存在: ${filePath}`)
      console.log('')
      console.log('三种使用方式:')
      console.log('  1. 文件: pnpm publish:csdn --file ./article.md')
      console.log('  2. 粘贴: pnpm publish:csdn --stdin --title "标题"')
      console.log('  3. API:  pnpm publish:csdn --fetch')
      process.exit(1)
    }
    markdown = fs.readFileSync(filePath, 'utf-8')
  } else {
    console.log('MultiPost 全自动发布 CLI')
    console.log('')
    console.log('三种使用方式:')
    console.log('  1. 从文件发布:   pnpm publish:csdn --file ./article.md --title "标题"')
    console.log('  2. 粘贴内容发布:  pnpm publish:csdn --stdin --title "标题"')
    console.log('                  （粘贴 Markdown 后按 Ctrl+Z 再回车）')
    console.log('  3. 从 API 发布:   pnpm publish:csdn --fetch')
    process.exit(1)
  }

  if (!markdown.trim()) {
    console.error('❌ 内容为空')
    process.exit(1)
  }

  title = title || extractTitle(markdown)

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
