/**
 * SSH-сервис (Модуль 8). Работает в main process.
 * Использует пакет ssh2 (MIT) — чистый JS, без нативных зависимостей.
 *
 * Профили хранятся в electron-store.
 * Пароли и приватные ключи шифруются через Electron safeStorage
 * (DPAPI на Windows, Keychain на macOS, libsecret на Linux).
 *
 * Каждая активная сессия — отдельный экземпляр ssh2.Client.
 * Данные от PTY приходят через колбэк onData → IPC push в renderer.
 * Статус сессии — через колбэк onStatus.
 */
import { safeStorage } from 'electron'
import { Client, ConnectConfig } from 'ssh2'
import type {
  SshProfile,
  SshProfilePublic,
  SshConnectQuery,
  SshResizeQuery,
  SshInputQuery,
  SshDataEvent,
  SshStatusEvent,
} from '@shared/ssh-types'

// ─── Хранилище профилей ────────────────────────────────────────────────────

// Динамический импорт electron-store (ESM-совместимый, CJS в main).
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Store = require('electron-store')

const store = new Store({
  name: 'ssh-profiles',
  defaults: { profiles: [] },
})

/** Шифрует строку через safeStorage. Возвращает base64. */
function encrypt(plain: string): string {
  if (!safeStorage.isEncryptionAvailable()) return plain
  return safeStorage.encryptString(plain).toString('base64')
}

/** Дешифрует base64-строку через safeStorage. */
function decrypt(cipher: string): string {
  if (!safeStorage.isEncryptionAvailable()) return cipher
  try {
    return safeStorage.decryptString(Buffer.from(cipher, 'base64'))
  } catch {
    return ''
  }
}

/** Вернуть все профили без чувствительных полей. */
export function listProfiles(): SshProfilePublic[] {
  const profiles: SshProfile[] = store.get('profiles') as SshProfile[]
  return profiles.map(({ password, privateKey, ...pub }) => ({
    ...pub,
    hasPassword: !!(password || privateKey),
  }))
}

/** Сохранить (create / update) профиль. Пароль и ключ шифруются. */
export function saveProfile(profile: SshProfile): SshProfilePublic {
  const profiles: SshProfile[] = store.get('profiles') as SshProfile[]
  const encrypted: SshProfile = {
    ...profile,
    password: profile.password ? encrypt(profile.password) : undefined,
    privateKey: profile.privateKey ? encrypt(profile.privateKey) : undefined,
  }
  const idx = profiles.findIndex((p) => p.id === profile.id)
  if (idx >= 0) {
    profiles[idx] = encrypted
  } else {
    profiles.push(encrypted)
  }
  store.set('profiles', profiles)
  const { password, privateKey, ...pub } = encrypted
  return { ...pub, hasPassword: !!(password || privateKey) }
}

/** Удалить профиль по id. */
export function deleteProfile(id: string): void {
  const profiles: SshProfile[] = store.get('profiles') as SshProfile[]
  store.set(
    'profiles',
    profiles.filter((p) => p.id !== id)
  )
}

/** Получить профиль с расшифрованным паролем/ключом (только для connect). */
function getProfileDecrypted(id: string): SshProfile | null {
  const profiles: SshProfile[] = store.get('profiles') as SshProfile[]
  const p = profiles.find((x) => x.id === id)
  if (!p) return null
  return {
    ...p,
    password: p.password ? decrypt(p.password) : undefined,
    privateKey: p.privateKey ? decrypt(p.privateKey) : undefined,
  }
}

// ─── Активные сессии ───────────────────────────────────────────────────────

interface ActiveSession {
  client: Client
  /** ssh2 shell channel (PTY). */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  channel: any | null
}

const sessions = new Map<string, ActiveSession>()

type OnDataCb = (ev: SshDataEvent) => void
type OnStatusCb = (ev: SshStatusEvent) => void

/**
 * Открыть SSH-сессию (password или key auth).
 * Колбэки вызываются из main thread — IPC push отправляется снаружи.
 */
export function connect(
  query: SshConnectQuery & { password?: string; privateKey?: string },
  onData: OnDataCb,
  onStatus: OnStatusCb
): void {
  const { sessionId, profileId } = query

  // Если сессия уже открыта — закрыть старую.
  disconnectSession(sessionId)

  const profile = getProfileDecrypted(profileId)
  if (!profile) {
    onStatus({ sessionId, status: 'error', error: 'Профиль не найден' })
    return
  }

  // Пароль может прийти напрямую из renderer (если пользователь ввёл его
  // в диалоге), либо взят из сохранённого профиля.
  const password = query.password ?? profile.password
  const privateKey = query.privateKey ?? profile.privateKey

  onStatus({ sessionId, status: 'connecting' })

  const client = new Client()
  sessions.set(sessionId, { client, channel: null })

  const cfg: ConnectConfig = {
    host: profile.host,
    port: profile.port,
    username: profile.username,
    readyTimeout: 15000,
    keepaliveInterval: 10000,
  }

  if (profile.authType === 'key' && privateKey) {
    cfg.privateKey = privateKey
    if (password) cfg.passphrase = password // passphrase для ключа
  } else if (password) {
    cfg.password = password
  }

  client.on('ready', () => {
    client.shell(
      { term: 'xterm-256color', cols: 80, rows: 24 },
      (err, stream) => {
        if (err) {
          onStatus({ sessionId, status: 'error', error: err.message })
          client.end()
          return
        }

        const sess = sessions.get(sessionId)
        if (sess) sess.channel = stream

        onStatus({ sessionId, status: 'connected' })

        // Обновляем lastConnectedAt в профиле.
        const profiles: SshProfile[] = store.get('profiles') as SshProfile[]
        const idx = profiles.findIndex((p) => p.id === profileId)
        if (idx >= 0) {
          profiles[idx].lastConnectedAt = Date.now()
          store.set('profiles', profiles)
        }

        stream.on('data', (chunk: Buffer) => {
          onData({ sessionId, data: chunk.toString('utf8') })
        })

        stream.stderr.on('data', (chunk: Buffer) => {
          onData({ sessionId, data: chunk.toString('utf8') })
        })

        stream.on('close', () => {
          onStatus({ sessionId, status: 'disconnected' })
          sessions.delete(sessionId)
        })
      }
    )
  })

  client.on('error', (err) => {
    onStatus({ sessionId, status: 'error', error: err.message })
    sessions.delete(sessionId)
  })

  client.on('end', () => {
    const s = sessions.get(sessionId)
    // Если channel ещё не установлен — уведомляем об отключении здесь.
    if (!s?.channel) {
      onStatus({ sessionId, status: 'disconnected' })
      sessions.delete(sessionId)
    }
  })

  client.connect(cfg)
}

/** Отправить данные (нажатия клавиш) в PTY. */
export function sendInput(query: SshInputQuery): void {
  const sess = sessions.get(query.sessionId)
  if (sess?.channel) {
    sess.channel.write(query.data)
  }
}

/** Сообщить PTY о новом размере терминала. */
export function resizeTerminal(query: SshResizeQuery): void {
  const sess = sessions.get(query.sessionId)
  if (sess?.channel) {
    sess.channel.setWindow(query.rows, query.cols, 0, 0)
  }
}

/** Закрыть конкретную сессию. */
export function disconnectSession(sessionId: string): void {
  const sess = sessions.get(sessionId)
  if (sess) {
    try {
      sess.channel?.close()
      sess.client.end()
    } catch {
      // Молча — сессия могла уже упасть.
    }
    sessions.delete(sessionId)
  }
}

/** Закрыть все сессии (при выходе из приложения). */
export function disconnectAll(): void {
  for (const sessionId of sessions.keys()) {
    disconnectSession(sessionId)
  }
}