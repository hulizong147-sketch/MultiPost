/**
 * MultiPost Desktop 启动器
 *
 * 一条命令启动全套：
 *   前端 (Vite) + 后端 (Fastify) + Electron 窗口
 *
 * 用法: pnpm desktop
 */
import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import path from 'path'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function run(name: string, cmd: string, args: string[], env?: Record<string, string>) {
  console.log(`[${name}] 启动中...`)
  const p = spawn(cmd, args, {
    cwd: ROOT,
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  })
  p.on('exit', (code) => console.log(`[${name}] 退出 (${code})`))
  return p
}

console.log('🚀 MultiPost Desktop 启动中...\n')

// 1. API 后端
run('API', 'pnpm', ['--filter', '@multipost/api', 'dev'])

// 2. 前端（设 VITE_CACHE_DIR 避免 .vite-temp 权限问题）
const isWin = process.platform === 'win32'
run('Web', 'pnpm', ['--filter', '@multipost/web', 'dev'],
  isWin ? { VITE_CACHE_DIR: path.join(process.env.TEMP || '/tmp', 'vite', 'multipost') } : {}
)

// 3. 等 8 秒让前后端启动，然后启动 Electron
setTimeout(() => {
  console.log('\n🖥️  启动 Electron 桌面窗口...\n')
  run('Desktop', 'pnpm', ['--filter', '@multipost/electron', 'exec', 'electron', '.'])
}, 8000)
