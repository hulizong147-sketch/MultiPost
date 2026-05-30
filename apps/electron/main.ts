/**
 * MultiPost Electron 桌面壳
 *
 * 工作原理：
 * 1. 启动 Fastify API 服务（localhost:3000）
 * 2. 等待就绪后打开 BrowserWindow，加载前端页面
 * 3. 用户在 Web UI 中点击发布 → API 调用 Playwright → 全自动发布
 *
 * 为什么能全自动发布？
 * Electron 运行在用户桌面，不受 WorkBuddy 沙箱限制。
 * Playwright 可以直接控制用户本地的 Chrome 浏览器。
 */

import { app, BrowserWindow } from 'electron'
import { spawn, type ChildProcess } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = path.resolve(__dirname, '../..')

let apiProcess: ChildProcess | null = null
let mainWindow: BrowserWindow | null = null

const API_PORT = 3000
const WEB_PORT = 5173
const WEB_URL = `http://localhost:${WEB_PORT}`

// ====== 启动 API 服务 ======
function startApiServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('🚀 启动 API 服务...')

    apiProcess = spawn('pnpm', ['--filter', '@multipost/api', 'dev'], {
      cwd: PROJECT_ROOT,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let started = false

    apiProcess.stdout?.on('data', (data: Buffer) => {
      const msg = data.toString()
      process.stdout.write(`[API] ${msg}`)
      if (!started && (msg.includes('listening') || msg.includes('localhost:3000'))) {
        started = true
        console.log('✅ API 就绪')
        resolve()
      }
    })

    apiProcess.stderr?.on('data', (data: Buffer) => {
      process.stderr.write(`[API:err] ${data.toString()}`)
    })

    apiProcess.on('error', reject)
    apiProcess.on('exit', (code) => {
      if (!started) reject(new Error(`API exited with code ${code}`))
    })

    setTimeout(() => { if (!started) { console.log('⚠️  未检测到 API 启动信号，尝试继续...'); resolve() } }, 15000)
  })
}

// ====== 等待前端就绪 ======
async function waitForWebServer(): Promise<void> {
  console.log('⏳ 等待前端服务...')
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(WEB_URL)
      if (res.ok) { console.log('✅ 前端就绪'); return }
    } catch {}
    await new Promise(r => setTimeout(r, 1000))
  }
  console.log('⚠️  前端超时，尝试继续...')
}

// ====== 创建窗口 ======
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    title: 'MultiPost - Write once, publish everywhere',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  mainWindow.loadURL(WEB_URL)
  mainWindow.on('closed', () => { mainWindow = null })
}

// ====== 生命周期 ======
app.whenReady().then(async () => {
  try {
    await startApiServer()
    await waitForWebServer()
    createWindow()
    console.log('✅ MultiPost Desktop 已启动')
    console.log(`   API:  http://localhost:${API_PORT}`)
    console.log(`   Web:  ${WEB_URL}`)
    console.log('   在编辑器中写 Markdown → 选 CSDN → 点 Publish → 全自动发布！')
  } catch (err) {
    console.error('❌ 启动失败:', err)
    app.quit()
  }
})

app.on('window-all-closed', () => {
  if (apiProcess) {
    apiProcess.kill()
  }
  app.quit()
})

app.on('before-quit', () => {
  if (apiProcess) {
    apiProcess.kill()
  }
})
