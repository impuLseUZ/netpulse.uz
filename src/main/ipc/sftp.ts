/**
 * IPC-домен 'sftp': двухпанельный файловый менеджер (Модуль 8.2).
 */
import { CHANNELS } from '@shared/channels'
import type {
  SftpListQuery,
  SftpListResult,
  SftpDownloadQuery,
  SftpUploadQuery,
  SftpMkdirQuery,
  SftpRenameQuery,
  SftpDeleteQuery,
  LocalListQuery,
  LocalListResult,
  SftpTransferQuery,
  SftpCancelQuery,
} from '@shared/ssh-types'
import { handle } from './handle'
import {
  openSftp,
  closeSftp,
  listDirectory,
  downloadFile,
  uploadFile,
  makeDirectory,
  renameEntry,
  deleteEntry,
  listLocalDirectory,
  cancelTransfer
} from '../services/sftp'
import * as path from 'path'
import * as fs from 'fs'

export function registerSftpIpc(): void {
  // ── SFTP соединение ──────────────────────────────────────────────────────
  handle<void>(CHANNELS.sftp.open, async (arg) => {
    const { sessionId } = arg as { sessionId: string }
    await openSftp(sessionId)
  })

  handle<void>(CHANNELS.sftp.close, (arg) => {
    const { sessionId } = arg as { sessionId: string }
    closeSftp(sessionId)
  })

  // ── Удалённый листинг ────────────────────────────────────────────────────
  handle<SftpListResult>(CHANNELS.sftp.list, async (arg) => {
    return listDirectory(arg as SftpListQuery)
  })

  // ── Локальный листинг ────────────────────────────────────────────────────
  handle<LocalListResult>(CHANNELS.sftp.localList, async (arg) => {
    const query = arg as LocalListQuery & { getHome?: boolean }
    return listLocalDirectory({
      localPath: query.localPath,
      showHidden: query.showHidden ?? false,
      getHome: query.getHome,
    })
  })

  // ── Передача файлов ──────────────────────────────────────────────────────

  /** local → remote */
  handle<void>(CHANNELS.sftp.transferToRemote, async (arg) => {
    const q = arg as SftpTransferQuery
    if (!fs.existsSync(q.localPath)) throw new Error(`Файл не найден: ${q.localPath}`)
    const filename = path.basename(q.localPath)
    const remoteDest = q.remotePath.replace(/\/$/, '') + '/' + filename
    await uploadFile({ sessionId: q.sessionId, localPath: q.localPath, remotePath: remoteDest })
  })

  /** remote → local */
  handle<void>(CHANNELS.sftp.transferToLocal, async (arg) => {
    const q = arg as SftpTransferQuery
    const filename = path.basename(q.remotePath)
    const localDest = path.join(q.localPath, filename)
    await downloadFile({ sessionId: q.sessionId, remotePath: q.remotePath, localPath: localDest })
  })

  /** Отменить активную передачу (upload/download). */
  handle<boolean>(CHANNELS.sftp.cancelTransfer, (arg) => {
    const q = arg as SftpCancelQuery
    return cancelTransfer(q.transferId)
  })

  // ── Файловые операции (remote) ───────────────────────────────────────────
  handle<void>(CHANNELS.sftp.download, async (arg) => {
    const q = arg as SftpDownloadQuery
    await downloadFile(q)
  })

  handle<void>(CHANNELS.sftp.upload, async (arg) => {
    const q = arg as SftpUploadQuery
    await uploadFile(q)
  })

  handle<void>(CHANNELS.sftp.mkdir, async (arg) => {
    await makeDirectory(arg as SftpMkdirQuery)
  })

  handle<void>(CHANNELS.sftp.rename, async (arg) => {
    await renameEntry(arg as SftpRenameQuery)
  })

  handle<void>(CHANNELS.sftp.delete, async (arg) => {
    await deleteEntry(arg as SftpDeleteQuery)
  })
}