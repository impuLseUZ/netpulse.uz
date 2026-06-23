/**
 * Сервис автообновления (Модуль 7).
 * Вся логика обновления — здесь, в main process. Renderer только отображает
 * состояние через IPC-событие updater:state и шлёт команды (check/download/install).
 *
 * Лицензия electron-updater: MIT. Для надёжной работы апдейтера нужна подпись кода
 * (Windows SmartScreen, обязательна на macOS) — см. TZ, раздел 4.5 и Модуль 7.
 *
 * Ошибки (нет сети, недоступен фид) обрабатываются тихо: переводим статус в 'error'
 * и НЕ роняем приложение, без навязчивых модалок.
 */
import { BrowserWindow } from 'electron'
import pkg from 'electron-updater'
import { CHANNELS } from '@shared/channels'
import { UpdateInfo, UpdateProgress, UpdateState } from '@shared/types'
import { getSettings } from './settings'

const { autoUpdater } = pkg

let current: UpdateState = { status: 'idle' }
let initialized = false

/** Текущее состояние — для инициализации UI через updater:getState. */
export function getUpdateState(): UpdateState {
  return current
}

/** Обновляет состояние и рассылает его во все окна. */
function setState(patch: Partial<UpdateState>): void {
  current = { ...current, ...patch }
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(CHANNELS.updater.stateEvent, current)
  }
}

function toUpdateInfo(info: pkg.UpdateInfo): UpdateInfo {
  const notes = info.releaseNotes
  return {
    version: info.version,
    releaseName: info.releaseName ?? undefined,
    releaseDate: info.releaseDate,
    releaseNotes:
      typeof notes === 'string'
        ? notes
        : Array.isArray(notes)
          ? notes.map((n) => n.note ?? '').join('\n\n')
          : undefined
  }
}

/** Однократная настройка слушателей electron-updater. */
function ensureInitialized(): void {
  if (initialized) return
  initialized = true

  const settings = getSettings()
  autoUpdater.autoDownload = settings.updateAutoDownload
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => setState({ status: 'checking', error: undefined }))
  autoUpdater.on('update-available', (info) =>
    setState({ status: 'available', info: toUpdateInfo(info) })
  )
  autoUpdater.on('update-not-available', () =>
    setState({ status: 'not-available', info: undefined, progress: undefined })
  )
  autoUpdater.on('download-progress', (p) => {
    const progress: UpdateProgress = {
      percent: p.percent,
      transferred: p.transferred,
      total: p.total,
      bytesPerSecond: p.bytesPerSecond
    }
    setState({ status: 'downloading', progress })
  })
  autoUpdater.on('update-downloaded', (info) =>
    setState({ status: 'downloaded', info: toUpdateInfo(info), progress: undefined })
  )
  autoUpdater.on('error', (err) =>
    // Тихо: показываем как состояние, не роняем приложение.
    setState({ status: 'error', error: err?.message ?? String(err) })
  )
}

/** Проверка обновлений. Безопасна к вызову без сети (ошибка уйдёт в состояние). */
export async function checkForUpdates(): Promise<void> {
  ensureInitialized()
  try {
    await autoUpdater.checkForUpdates()
  } catch (err) {
    setState({ status: 'error', error: (err as Error).message })
  }
}

/** Запуск загрузки вручную (когда autoDownload выключен). */
export async function downloadUpdate(): Promise<void> {
  ensureInitialized()
  try {
    await autoUpdater.downloadUpdate()
  } catch (err) {
    setState({ status: 'error', error: (err as Error).message })
  }
}

/** Перезапуск и установка. */
export function quitAndInstall(): void {
  autoUpdater.quitAndInstall()
}

/** Вызывается из main при старте окна, если включена проверка при запуске. */
export function maybeCheckOnStart(): void {
  if (getSettings().updateCheckOnStart) {
    void checkForUpdates()
  }
}
