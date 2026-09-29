/**
 * SFTP-сервис (Модуль 8.2).
 * Использует SFTP-подсистему ssh2 поверх существующего SSH-соединения.
 *
 * Важно: SFTP-сессия открывается на том же Client что и shell-сессия,
 * через отдельный канал. Это позволяет иметь одновременно терминал и
 * файловый менеджер в рамках одного SSH-подключения.
 */
import { BrowserWindow, dialog } from 'electron'
import { Client } from 'ssh2'
import type { SFTPWrapper } from 'ssh2'
import * as path from 'path'
import * as fs from 'fs'
import type {
  SftpEntry,
  SftpListQuery,
  SftpListResult,
  SftpDownloadQuery,
  SftpUploadQuery,
  SftpMkdirQuery,
  SftpRenameQuery,
  SftpDeleteQuery,
  SftpProgressEvent,
} from '@shared/ssh-types'
import { CHANNELS } from '@shared/channels'

// ─── Активные SFTP-сессии ────────────────────────────────────────────────────

const sftpSessions = new Map<string, SFTPWrapper>()

/** Зарегистрировать ssh2.Client для SFTP (вызывается из ssh.ts после connect). */
const sshClients = new Map<string, Client>()

/** Активные передачи: transferId → функция отмены. Позволяет прервать конкретную передачу. */
const activeTransfers = new Map<string, () => void>()

/**
 * Отменить активную передачу по transferId.
 * Возвращает false, если передача не найдена (уже завершилась/неизвестный id).
 */
export function cancelTransfer(transferId: string): boolean {
  const cancel = activeTransfers.get(transferId)
  if (!cancel) return false
  cancel()
  return true
}

export function registerSshClient(sessionId: string, client: Client): void {
  sshClients.set(sessionId, client)
}

export function unregisterSshClient(sessionId: string): void {
  sshClients.delete(sessionId)
  closeSftp(sessionId)
}

// ─── Утилиты ─────────────────────────────────────────────────────────────────

function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload)
  }
}

/** Форматировать Unix mode в строку вида -rwxr-xr-x. */
function formatPermissions(mode: number): string {
  const type = (mode & 0o170000) === 0o040000 ? 'd' : '-'
  const bits = [
    (mode & 0o400) ? 'r' : '-',
    (mode & 0o200) ? 'w' : '-',
    (mode & 0o100) ? 'x' : '-',
    (mode & 0o040) ? 'r' : '-',
    (mode & 0o020) ? 'w' : '-',
    (mode & 0o010) ? 'x' : '-',
    (mode & 0o004) ? 'r' : '-',
    (mode & 0o002) ? 'w' : '-',
    (mode & 0o001) ? 'x' : '-',
  ]
  return type + bits.join('')
}

// ─── SFTP операции ───────────────────────────────────────────────────────────

/** Открыть SFTP-сессию для sessionId. */
export function openSftp(sessionId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = sshClients.get(sessionId)
    if (!client) {
      reject(new Error('SSH-клиент не найден. Сначала подключитесь по SSH.'))
      return
    }
    if (sftpSessions.has(sessionId)) {
      resolve()
      return
    }
    client.sftp((err, sftp) => {
      if (err) { reject(err); return }
      sftpSessions.set(sessionId, sftp)
      resolve()
    })
  })
}

/** Закрыть SFTP-сессию. */
export function closeSftp(sessionId: string): void {
  const sftp = sftpSessions.get(sessionId)
  if (sftp) {
    try { sftp.end() } catch { /* ignore */ }
    sftpSessions.delete(sessionId)
  }
}

/** Получить листинг директории. */
export function listDirectory(query: SftpListQuery): Promise<SftpListResult> {
  return new Promise((resolve, reject) => {
    const sftp = sftpSessions.get(query.sessionId)
    if (!sftp) { reject(new Error('SFTP не открыт')); return }

    sftp.readdir(query.remotePath, (err, list) => {
      if (err) { reject(err); return }

      const entries: SftpEntry[] = list.map((item) => {
        const isDir = (item.attrs.mode & 0o170000) === 0o040000
        return {
          name: item.filename,
          path: query.remotePath.replace(/\/$/, '') + '/' + item.filename,
          isDirectory: isDir,
          size: item.attrs.size ?? 0,
          modifiedAt: (item.attrs.mtime ?? 0) * 1000,
          mode: item.attrs.mode ?? 0,
          permissions: formatPermissions(item.attrs.mode ?? 0),
        }
      })

      // Сортируем: сначала директории, потом файлы, каждая группа по имени.
      entries.sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
        return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      })

      resolve({ path: query.remotePath, entries })
    })
  })
}

/**
 * Трекер скорости: скользящее среднее по окну 2 секунды.
 * Это даёт плавные показания без резких скачков.
 */
class SpeedTracker {
  private samples: { bytes: number; ts: number }[] = []
  private readonly windowMs: number

  constructor(windowMs = 2000) { this.windowMs = windowMs }

  add(bytes: number): void {
    const now = Date.now()
    this.samples.push({ bytes, ts: now })
    // Убираем старые сэмплы за пределами окна
    const cutoff = now - this.windowMs
    this.samples = this.samples.filter((s) => s.ts >= cutoff)
  }

  /** Скорость в байтах/сек. */
  bps(): number {
    if (this.samples.length < 2) return 0
    const totalBytes = this.samples.reduce((s, x) => s + x.bytes, 0)
    const span = this.samples[this.samples.length - 1].ts - this.samples[0].ts
    return span > 0 ? (totalBytes / span) * 1000 : 0
  }

  /** Оставшееся время в секундах. */
  eta(remaining: number): number {
    const speed = this.bps()
    return speed > 0 ? remaining / speed : -1
  }
}

/** Скачать файл: remote → local. */
export async function downloadFile(query: SftpDownloadQuery): Promise<void> {
  const sftp = sftpSessions.get(query.sessionId)
  if (!sftp) throw new Error('SFTP не открыт')

  const filename = path.basename(query.remotePath)
  const transferId = `dl-${Date.now()}`
  const tracker = new SpeedTracker()
  let cancelled = false

  // Получаем размер файла.
  const stat = await new Promise<{ size: number }>((res, rej) =>
    sftp.stat(query.remotePath, (e, s) => e ? rej(e) : res({ size: s.size ?? 0 }))
  )

  try {
    await new Promise<void>((resolve, reject) => {
      const readStream = sftp.createReadStream(query.remotePath)
      const writeStream = fs.createWriteStream(query.localPath)
      let transferred = 0

      activeTransfers.set(transferId, () => {
        cancelled = true
        readStream.destroy(new Error('cancelled'))
        writeStream.destroy(new Error('cancelled'))
      })

      readStream.on('data', (chunk: Buffer | string) => {
        const bytes = typeof chunk === 'string' ? chunk.length : chunk.length
        transferred += bytes
        tracker.add(bytes)
        broadcast(CHANNELS.sftp.progressEvent, {
          sessionId: query.sessionId,
          transferId,
          direction: 'download',
          filename,
          transferred,
          total: stat.size,
          bytesPerSecond: tracker.bps(),
          eta: tracker.eta(stat.size - transferred),
          status: 'active',
        } satisfies SftpProgressEvent)
      })

      readStream.on('error', reject)
      writeStream.on('error', reject)
      writeStream.on('close', resolve)
      readStream.pipe(writeStream)
    })
    // Финальное событие: done
    broadcast(CHANNELS.sftp.progressEvent, {
      sessionId: query.sessionId, transferId, direction: 'download',
      filename, transferred: stat.size, total: stat.size,
      bytesPerSecond: 0, eta: 0, status: 'done',
    } satisfies SftpProgressEvent)
  } catch (err) {
    // Удаляем недокачанный файл — частичная копия хуже отсутствия файла.
    if (cancelled) {
      try { fs.unlinkSync(query.localPath) } catch { /* ignore */ }
    }
    broadcast(CHANNELS.sftp.progressEvent, {
      sessionId: query.sessionId, transferId, direction: 'download',
      filename, transferred: 0, total: stat.size,
      bytesPerSecond: 0, eta: -1, status: cancelled ? 'cancelled' : 'error',
      error: cancelled ? undefined : (err as Error).message,
    } satisfies SftpProgressEvent)
    if (!cancelled) throw err
  } finally {
    activeTransfers.delete(transferId)
  }
}

/** Загрузить файл: local → remote. */
export async function uploadFile(query: SftpUploadQuery): Promise<void> {
  const sftp = sftpSessions.get(query.sessionId)
  if (!sftp) throw new Error('SFTP не открыт')

  const filename = path.basename(query.localPath)
  const transferId = `ul-${Date.now()}`
  const stat = fs.statSync(query.localPath)
  const tracker = new SpeedTracker()
  let cancelled = false

  try {
    await new Promise<void>((resolve, reject) => {
      const readStream = fs.createReadStream(query.localPath)
      const writeStream = sftp.createWriteStream(query.remotePath)
      let transferred = 0

      activeTransfers.set(transferId, () => {
        cancelled = true
        readStream.destroy(new Error('cancelled'))
        // ssh2's WriteStream.destroy() doesn't accept an error argument (unlike Node's).
        writeStream.destroy()
      })

      readStream.on('data', (chunk: Buffer | string) => {
        const bytes = typeof chunk === 'string' ? chunk.length : chunk.length
        transferred += bytes
        tracker.add(bytes)
        broadcast(CHANNELS.sftp.progressEvent, {
          sessionId: query.sessionId,
          transferId,
          direction: 'upload',
          filename,
          transferred,
          total: stat.size,
          bytesPerSecond: tracker.bps(),
          eta: tracker.eta(stat.size - transferred),
          status: 'active',
        } satisfies SftpProgressEvent)
      })

      readStream.on('error', reject)
      writeStream.on('error', reject)
      writeStream.on('close', resolve)
      readStream.pipe(writeStream)
    })
    broadcast(CHANNELS.sftp.progressEvent, {
      sessionId: query.sessionId, transferId, direction: 'upload',
      filename, transferred: stat.size, total: stat.size,
      bytesPerSecond: 0, eta: 0, status: 'done',
    } satisfies SftpProgressEvent)
  } catch (err) {
    // Удаляем недокачанный файл на сервере — частичная копия хуже отсутствия файла.
    if (cancelled) {
      sftp.unlink(query.remotePath, () => { /* ignore */ })
    }
    broadcast(CHANNELS.sftp.progressEvent, {
      sessionId: query.sessionId, transferId, direction: 'upload',
      filename, transferred: 0, total: stat.size,
      bytesPerSecond: 0, eta: -1, status: cancelled ? 'cancelled' : 'error',
      error: cancelled ? undefined : (err as Error).message,
    } satisfies SftpProgressEvent)
    if (!cancelled) throw err
  } finally {
    activeTransfers.delete(transferId)
  }
}

/** Создать директорию. */
export function makeDirectory(query: SftpMkdirQuery): Promise<void> {
  return new Promise((resolve, reject) => {
    const sftp = sftpSessions.get(query.sessionId)
    if (!sftp) { reject(new Error('SFTP не открыт')); return }
    sftp.mkdir(query.remotePath, (err) => err ? reject(err) : resolve())
  })
}

/** Переименовать / переместить. */
export function renameEntry(query: SftpRenameQuery): Promise<void> {
  return new Promise((resolve, reject) => {
    const sftp = sftpSessions.get(query.sessionId)
    if (!sftp) { reject(new Error('SFTP не открыт')); return }
    sftp.rename(query.oldPath, query.newPath, (err) => err ? reject(err) : resolve())
  })
}

/** Удалить файл или директорию (рекурсивно для директорий). */
export function deleteEntry(query: SftpDeleteQuery): Promise<void> {
  return new Promise((resolve, reject) => {
    const sftp = sftpSessions.get(query.sessionId)
    if (!sftp) { reject(new Error('SFTP не открыт')); return }

    if (query.isDirectory) {
      sftp.rmdir(query.remotePath, (err) => err ? reject(err) : resolve())
    } else {
      sftp.unlink(query.remotePath, (err) => err ? reject(err) : resolve())
    }
  })
}

/** Открыть диалог выбора места сохранения и вернуть путь. */
export async function showSaveDialog(filename: string): Promise<string | null> {
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  const result = await dialog.showSaveDialog(win, {
    defaultPath: filename,
    properties: ['showOverwriteConfirmation'],
  })
  return result.canceled ? null : result.filePath ?? null
}

/** Открыть диалог выбора файла для загрузки. */
export async function showOpenDialog(): Promise<string | null> {
  const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0]
  const result = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
  })
  return result.canceled ? null : (result.filePaths[0] ?? null)
}

// ─── Локальная файловая система (левая панель) ───────────────────────────────

import type { LocalEntry, LocalListResult, LocalListQuery } from '@shared/ssh-types'
import * as os from 'os'

/** Определить тип файла по расширению. */
function getKind(name: string, isDir: boolean): string {
  if (isDir) return 'folder'
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    zip: 'zip', tar: 'archive', gz: 'archive', '7z': 'archive', rar: 'archive',
    jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', svg: 'image', webp: 'image',
    mp4: 'video', mkv: 'video', avi: 'video', mov: 'video',
    mp3: 'audio', wav: 'audio', flac: 'audio',
    pdf: 'pdf',
    doc: 'doc', docx: 'doc', xls: 'spreadsheet', xlsx: 'spreadsheet',
    js: 'code', ts: 'code', tsx: 'code', jsx: 'code', py: 'code',
    sh: 'script', bat: 'script', ps1: 'script',
    txt: 'text', md: 'text', log: 'text',
    exe: 'exe', msi: 'exe',
    lnk: 'link', sys: 'sys',
  }
  return map[ext] ?? 'file'
}

/** Листинг локальной директории. */
export async function listLocalDirectory(query: LocalListQuery & { getHome?: boolean }): Promise<LocalListResult> {
  let dirPath = query.localPath

  // Если запрошена домашняя директория — используем её
  if (query.getHome) {
    dirPath = os.homedir()
  }

  // Windows: список дисков если путь пустой или "/"
  if (process.platform === 'win32' && (dirPath === '' || dirPath === '/')) {
    const { execSync } = require('child_process') as typeof import('child_process')
    try {
      const out = execSync('wmic logicaldisk get caption', { encoding: 'utf8' })
      const drives = out.split('\n')
        .map((l: string) => l.trim())
        .filter((l: string) => /^[A-Z]:$/.test(l))
        .map((d: string) => d + '\\')
      return { path: '/', entries: [], drives }
    } catch {
      return { path: '/', entries: [], drives: ['C:\\'] }
    }
  }

  // Windows: если корень без слэша — нормализуем
  if (process.platform === 'win32' && /^[A-Z]:$/.test(dirPath)) {
    dirPath = dirPath + '\\'
  }

  const entries: LocalEntry[] = []
  const items = fs.readdirSync(dirPath, { withFileTypes: true })

  for (const item of items) {
    // Фильтр скрытых файлов
    if (!query.showHidden && item.name.startsWith('.')) continue
    // Windows скрытые файлы — не фильтруем здесь (слишком дорого без attrs)
    try {
      const fullPath = path.join(dirPath, item.name)
      const stat = fs.statSync(fullPath)
      // isDirectory check done via item.isDirectory() directly
      entries.push({
        name: item.name,
        path: fullPath,
        isDirectory: item.isDirectory(),
        size: stat.size,
        modifiedAt: stat.mtimeMs,
        kind: getKind(item.name, item.isDirectory()),
      })
    } catch {
      // Нет прав — пропускаем.
    }
  }

  // Директории сверху, файлы снизу; в каждой группе по имени.
  entries.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })

  return { path: dirPath, entries }
}

/** Получить домашнюю директорию пользователя. */
export function getHomeDir(): string {
  return os.homedir()
}