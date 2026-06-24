/**
 * Сервис проверки обновлений (Модуль 7) — упрощённая версия.
 *
 * Вместо electron-updater используем прямой запрос к GitHub Releases API.
 * Пользователь сам скачивает новую версию по ссылке — никакой фоновой
 * загрузки и установки. Это проще, не требует подписи кода и работает
 * одинаково надёжно.
 *
 * Алгоритм:
 *  1. GET https://api.github.com/repos/impuLseUZ/netpulse.uz/releases/latest
 *  2. Сравниваем tag_name (v1.2.3) с app.getVersion()
 *  3. Если новее — шлём UpdateState { status: 'available', info, downloadUrl }
 */
import { BrowserWindow, app, shell } from 'electron'
import { CHANNELS } from '@shared/channels'
import { UpdateState, UpdateInfo } from '@shared/types'
import { getSettings } from './settings'

const GITHUB_OWNER = 'impuLseUZ'
const GITHUB_REPO  = 'netpulse.uz'
const API_URL = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`
const RELEASES_URL = `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`

let current: UpdateState = { status: 'idle' }

export function getUpdateState(): UpdateState {
  return current
}

function setState(patch: Partial<UpdateState>): void {
  current = { ...current, ...patch }
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(CHANNELS.updater.stateEvent, current)
  }
}

/** Сравнение версий вида "1.2.3". Возвращает true если b > a. */
function isNewer(current: string, latest: string): boolean {
  const parse = (v: string): number[] =>
    v.replace(/^v/, '').split('.').map((n) => parseInt(n, 10) || 0)
  const [a, b] = [parse(current), parse(latest)]
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (b[i] ?? 0) - (a[i] ?? 0)
    if (diff !== 0) return diff > 0
  }
  return false
}

export async function checkForUpdates(): Promise<void> {
  setState({ status: 'checking', error: undefined })
  try {
    const res = await fetch(API_URL, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'User-Agent': `NetPulse/${app.getVersion()}`,
      },
    })

    if (!res.ok) {
      setState({ status: 'error', error: `GitHub API: ${res.status}` })
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await res.json() as any
    const latestVersion: string = (data.tag_name as string ?? '').replace(/^v/, '')
    const currentVersion = app.getVersion()

    if (!isNewer(currentVersion, latestVersion)) {
      setState({ status: 'not-available', info: undefined })
      return
    }

    // Формируем ссылку на скачивание — страница релиза на GitHub.
    const notes = typeof data.body === 'string' ? data.body : undefined
    const info: UpdateInfo & { downloadUrl: string } = {
      version: latestVersion,
      releaseName: data.name ?? undefined,
      releaseDate: data.published_at ?? undefined,
      releaseNotes: notes,
      downloadUrl: RELEASES_URL,
    }

    setState({ status: 'available', info })
  } catch (err) {
    setState({ status: 'error', error: (err as Error).message })
  }
}

/** Открыть страницу релизов в браузере. */
export function openReleasePage(): void {
  void shell.openExternal(RELEASES_URL)
}

/** Вызывается из main при старте, если включена проверка при запуске. */
export function maybeCheckOnStart(): void {
  if (getSettings().updateCheckOnStart) {
    void checkForUpdates()
  }
}

// Заглушки для обратной совместимости с IPC-доменом
export async function downloadUpdate(): Promise<void> {
  openReleasePage()
}
export function quitAndInstall(): void {
  openReleasePage()
}