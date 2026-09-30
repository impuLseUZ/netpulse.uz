import { app, shell, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { registerAllIpc } from './ipc'
import { maybeCheckOnStart } from './services/updater'
import { stopAllContinuous } from './services/ping'
import { disconnectAll as disconnectAllSsh } from './services/ssh'

const iconPath = app.isPackaged
  ? join(process.resourcesPath, 'resources/icon.png')
  : join(__dirname, '../../build/icon.png')

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 940,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0b0e14',
    icon: iconPath,
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  win.on('ready-to-show', () => {
    win.show()
    if (app.isPackaged) {
      maybeCheckOnStart()
    }
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      void shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    void win.loadURL(devUrl)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  registerAllIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  // Останавливаем непрерывные ping-сессии, чтобы не висели таймеры.
  stopAllContinuous()
  // Закрываем все SSH-сессии.
  disconnectAllSsh()
  if (process.platform !== 'darwin') app.quit()
})
