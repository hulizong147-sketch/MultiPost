/**
 * MultiPost Electron 桌面壳
 * 纯 JavaScript（Electron 不支持直接运行 .ts）
 */

const { app, BrowserWindow } = require('electron')

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
  console.log('MultiPost Desktop started')
})

app.on('window-all-closed', () => app.quit())
