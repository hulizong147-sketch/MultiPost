/**
 * MultiPost Electron 桌面壳
 *
 * 由 scripts/desktop.ts 启动器负责启动 API + 前端。
 * 本文件只负责创建 Electron BrowserWindow。
 */

import { app, BrowserWindow } from 'electron'

const WEB_URL = 'http://localhost:5173'

function createWindow() {
  const win = new BrowserWindow({
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

  win.loadURL(WEB_URL)
}

app.whenReady().then(() => {
  createWindow()
  console.log('✅ MultiPost Desktop 已启动')
})

app.on('window-all-closed', () => app.quit())
