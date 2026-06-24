/**
 * IPC-домен 'ssh': управление профилями и сессиями SSH-клиента (Модуль 8).
 * Push-события ssh:data и ssh:status рассылаются во все окна.
 */
import { BrowserWindow, ipcMain } from 'electron'
import { CHANNELS } from '@shared/channels'
import type {
  SshProfile,
  SshConnectQuery,
  SshResizeQuery,
  SshInputQuery,
  SshProfilePublic,
} from '@shared/ssh-types'
import { IpcResult } from '@shared/types'
import {
  listProfiles,
  saveProfile,
  deleteProfile,
  connect,
  sendInput,
  resizeTerminal,
  disconnectSession,
} from '../services/ssh'
import { handle } from './handle'

/** Вспомогательная рассылка push-события во все окна. */
function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload)
  }
}

export function registerSshIpc(): void {
  // ── Профили ──────────────────────────────────────────────────────────────

  handle<SshProfilePublic[]>(CHANNELS.ssh.listProfiles, () => listProfiles())

  handle<SshProfilePublic>(CHANNELS.ssh.saveProfile, (arg) => {
    const profile = arg as SshProfile
    return saveProfile(profile)
  })

  handle<void>(CHANNELS.ssh.deleteProfile, (arg) => {
    const { id } = arg as { id: string }
    deleteProfile(id)
  })

  // ── Сессии ───────────────────────────────────────────────────────────────

  /**
   * ssh:connect — invoke-вызов возвращает быстро (статус 'connecting');
   * дальнейшие события приходят через ssh:status и ssh:data push-каналы.
   */
  ipcMain.handle(
    CHANNELS.ssh.connect,
    async (_event, arg: unknown): Promise<IpcResult<void>> => {
      try {
        const query = arg as SshConnectQuery
        connect(
          query,
          (dataEv) => broadcast(CHANNELS.ssh.dataEvent, dataEv),
          (statusEv) => broadcast(CHANNELS.ssh.statusEvent, statusEv)
        )
        return { ok: true, data: undefined }
      } catch (err) {
        const e = err as Error
        return { ok: false, error: { code: 'E_SSH_CONNECT', message: e.message } }
      }
    }
  )

  handle<void>(CHANNELS.ssh.disconnect, (arg) => {
    const { sessionId } = arg as { sessionId: string }
    disconnectSession(sessionId)
  })

  /**
   * ssh:input — горячий путь (каждое нажатие клавиши).
   * Используем handle() для единообразия, но результат не нужен renderer'у.
   */
  handle<void>(CHANNELS.ssh.input, (arg) => {
    const q = arg as SshInputQuery
    sendInput(q)
  })

  handle<void>(CHANNELS.ssh.resize, (arg) => {
    const q = arg as SshResizeQuery
    resizeTerminal(q)
  })
}
