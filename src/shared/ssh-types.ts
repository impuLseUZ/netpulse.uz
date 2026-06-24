/**
 * Типы для SSH-модуля (Модуль 8).
 * Используются в main (сервис), preload (bridge) и renderer (store/UI).
 * Нет импортов из electron/node — только чистые типы.
 */

/** Тип аутентификации. */
export type SshAuthType = 'password' | 'key'

/** Профиль SSH-подключения (хранится через electron-store + safeStorage). */
export interface SshProfile {
  /** Уникальный идентификатор профиля. */
  id: string
  /** Человекочитаемое название (например «Prod Server», «Home NAS»). */
  label: string
  host: string
  port: number
  username: string
  authType: SshAuthType
  /**
   * Пароль / passphrase для ключа.
   * В памяти — открытый текст; в хранилище — зашифрован safeStorage.
   * Не сериализуется при отправке в renderer (поле намеренно опускается).
   */
  password?: string
  /**
   * Приватный ключ (OpenSSH PEM).
   * Хранится зашифрованным в safeStorage, в renderer не передаётся.
   */
  privateKey?: string
  /** Заметка / описание (опционально). */
  note?: string
  /** Метка времени последнего подключения (ms since epoch). */
  lastConnectedAt?: number
}

/** Профиль без чувствительных полей — именно это передаётся в renderer. */
export type SshProfilePublic = Omit<SshProfile, 'password' | 'privateKey'> & {
  /** Есть ли сохранённый пароль/ключ (для UI: показывать ли prompt). */
  hasPassword: boolean
}

/** Команда подключения из renderer в main. */
export interface SshConnectQuery {
  sessionId: string
  profileId: string
  /**
   * Пароль передаётся отдельно при каждом вызове connect
   * (renderer запрашивает у пользователя, в store не хранится).
   */
  password?: string
  privateKey?: string
}

/** Команда изменения размера терминала. */
export interface SshResizeQuery {
  sessionId: string
  cols: number
  rows: number
}

/** Ввод с клавиатуры из renderer → main → SSH-сервер. */
export interface SshInputQuery {
  sessionId: string
  data: string
}

/** Статус SSH-сессии. */
export type SshSessionStatus =
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'error'

/** Push-событие main → renderer: данные из PTY (stdout/stderr). */
export interface SshDataEvent {
  sessionId: string
  data: string
}

/** Push-событие main → renderer: изменение статуса сессии. */
export interface SshStatusEvent {
  sessionId: string
  status: SshSessionStatus
  /** Сообщение об ошибке (если status === 'error'). */
  error?: string
}

/** Состояние активной сессии в renderer (для store). */
export interface SshSession {
  sessionId: string
  profileId: string
  label: string
  host: string
  status: SshSessionStatus
  error?: string
}