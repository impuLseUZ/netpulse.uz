/**
 * Обёртка ipcMain.handle: единый формат IpcResult + перехват исключений.
 * Все доменные хендлеры регистрируются через handle(), чтобы renderer
 * всегда получал { ok, data } | { ok, error } и не падал на throw.
 */
import { ipcMain } from 'electron'
import { IpcResult } from '@shared/types'

export function handle<T>(
  channel: string,
  fn: (...args: unknown[]) => Promise<T> | T
): void {
  ipcMain.handle(channel, async (_event, ...args): Promise<IpcResult<T>> => {
    try {
      const data = await fn(...args)
      return { ok: true, data }
    } catch (err) {
      const e = err as Error & { code?: string }
      return {
        ok: false,
        error: {
          code: e.code ?? 'E_INTERNAL',
          message: e.message ?? 'Unknown error'
        }
      }
    }
  })
}
