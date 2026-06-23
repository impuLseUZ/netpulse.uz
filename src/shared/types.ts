/**
 * Общий контракт между main и renderer.
 * Переиспользуется в preload (типизация bridge) и в renderer (вызовы API).
 * Здесь не должно быть импортов из electron/node — только чистые типы.
 */

/** Унифицированный результат любого IPC-вызова. */
export type IpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: IpcError }

export interface IpcError {
  code: string
  message: string
  /** Человекочитаемое сообщение уже на языке UI, если сервис его сформировал. */
  details?: string
}

/** Темы оформления. */
export type ThemeMode = 'light' | 'dark' | 'system'

/** Языки интерфейса. */
export type Locale = 'ru' | 'en'

/** Сохраняемые настройки приложения (electron-store). */
export interface AppSettings {
  theme: ThemeMode
  locale: Locale
  /** Лимит одновременных сокетов/пингов. */
  concurrencyLimit: number
  /** Таймаут одиночной пробы по умолчанию, мс. */
  defaultTimeoutMs: number
  /** Автообновление: проверять при старте. */
  updateCheckOnStart: boolean
  /** Автообновление: загружать автоматически (иначе только уведомлять). */
  updateAutoDownload: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  locale: 'ru',
  concurrencyLimit: 64,
  defaultTimeoutMs: 1000,
  updateCheckOnStart: true,
  updateAutoDownload: false
}

/** Сведения о платформе и доступных возможностях (raw-сокеты и т.п.). */
export interface PlatformInfo {
  platform: NodeJS.Platform
  /** Доступны ли raw-сокеты (зависит от прав и наличия нативного модуля). */
  rawSocketsAvailable: boolean
  appVersion: string
  electronVersion: string
}

/* ───────────────────────── Автообновление (Модуль 7) ───────────────────────── */

/** Стадия процесса обновления для отображения в UI. */
export type UpdateStatus =
  | 'idle' // ничего не происходит
  | 'checking' // идёт проверка
  | 'available' // найдена новая версия
  | 'not-available' // обновлений нет
  | 'downloading' // идёт загрузка
  | 'downloaded' // загружено, готово к установке
  | 'error' // ошибка (обрабатывается тихо)

export interface UpdateInfo {
  version: string
  /** Release notes из релиза (строка или список по версиям). */
  releaseNotes?: string
  releaseName?: string
  releaseDate?: string
}

export interface UpdateProgress {
  percent: number
  transferred: number
  total: number
  bytesPerSecond: number
}

/** Полное состояние обновления, которое main шлёт в renderer через событие. */
export interface UpdateState {
  status: UpdateStatus
  info?: UpdateInfo
  progress?: UpdateProgress
  /** Текст ошибки (если status === 'error'); UI показывает ненавязчиво. */
  error?: string
}
