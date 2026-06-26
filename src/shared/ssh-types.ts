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
// ═══════════════════════════════════════════════════════════════════════════
// SFTP (Модуль 8.2)
// ═══════════════════════════════════════════════════════════════════════════

/** Запись файловой системы — файл или директория. */
export interface SftpEntry {
  name: string
  /** Полный абсолютный путь. */
  path: string
  isDirectory: boolean
  /** Размер в байтах. */
  size: number
  /** Время последнего изменения (ms since epoch). */
  modifiedAt: number
  /** Unix-права в числовом виде (например 33188 = rw-r--r--). */
  mode: number
  /** Строковое представление прав (например -rw-r--r--). */
  permissions: string
}

/** Запрос на листинг директории. */
export interface SftpListQuery {
  sessionId: string
  remotePath: string
}

/** Ответ на листинг. */
export interface SftpListResult {
  path: string
  entries: SftpEntry[]
}

/** Запрос на скачивание файла. */
export interface SftpDownloadQuery {
  sessionId: string
  remotePath: string
  /** Локальный путь назначения (выбирается диалогом на стороне main). */
  localPath: string
}

/** Запрос на загрузку файла. */
export interface SftpUploadQuery {
  sessionId: string
  /** Локальный путь источника. */
  localPath: string
  remotePath: string
}

/** Запрос на создание директории. */
export interface SftpMkdirQuery {
  sessionId: string
  remotePath: string
}

/** Запрос на переименование/перемещение. */
export interface SftpRenameQuery {
  sessionId: string
  oldPath: string
  newPath: string
}

/** Запрос на удаление файла или директории. */
export interface SftpDeleteQuery {
  sessionId: string
  remotePath: string
  isDirectory: boolean
}

/** Push-событие main → renderer: прогресс передачи файла. */
export interface SftpProgressEvent {
  sessionId: string
  /** Уникальный id операции. */
  transferId: string
  /** 'upload' или 'download'. */
  direction: 'upload' | 'download'
  filename: string
  transferred: number
  total: number
  /** Текущая скорость передачи в байтах/сек (скользящее среднее). */
  bytesPerSecond: number
  /** Оставшееся время в секундах (−1 если неизвестно). */
  eta: number
  /** Статус: 'active' | 'done' | 'error' */
  status: 'active' | 'done' | 'error'
  error?: string
}

/** Запись локальной файловой системы (левая панель). */
export interface LocalEntry {
  name: string
  path: string
  isDirectory: boolean
  size: number
  modifiedAt: number
  kind: string
}

/** Результат листинга локальной ФС. */
export interface LocalListResult {
  path: string
  entries: LocalEntry[]
  drives?: string[]  // Windows: список дисков
}

/** Запрос листинга локальной ФС. */
export interface LocalListQuery {
  localPath: string
  showHidden: boolean
}

/** Запрос передачи файлов local ↔ remote. */
export interface SftpTransferQuery {
  sessionId: string
  localPath: string
  remotePath: string
  /** 'upload' = local→remote, 'download' = remote→local */
  direction: 'upload' | 'download'
}