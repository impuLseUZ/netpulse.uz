import { create } from 'zustand'
import SpeedTestEngine, { type MeasurementConfig } from '@cloudflare/speedtest'
import type {
  NetworkInfo,
  SpeedtestPhase,
  SpeedtestResult,
  SpeedtestHistoryEntry
} from '@shared/speedtest-types'

/** Префикс для всех логов модуля — легко фильтровать в DevTools. */
const LOG = '[speedtest]'

/** bps -> Мбит/с (1 Мбит = 1e6 бит). */
function toMbps(bps: number | undefined): number | undefined {
  return bps == null ? undefined : bps / 1e6
}

/** Маппинг типа измерения движка в нашу фазу для UI. */
function phaseFromType(type: string): SpeedtestPhase | null {
  switch (type) {
    case 'latency':
    case 'latencyUnderLoad':
      return 'latency'
    case 'download':
      return 'download'
    case 'upload':
      return 'upload'
    default:
      return null
  }
}

/**
 * Набор измерений БЕЗ packetLoss.
 *
 * Фаза packetLoss у Cloudflare работает через WebRTC TURN
 * (turn.speed.cloudflare.com:50000). За фаерволом / NAT / корпоративной
 * сетью получить TURN-креды часто нельзя — движок кидает
 * "Error while measuring packet loss: ...", и это роняло весь тест.
 *
 * Packet loss в ТЗ — опциональная метрика (обязательны ping/download/
 * upload/jitter), поэтому исключаем фазу целиком: тест становится
 * устойчивым в любой сети. Значения латентности/полосы — точные,
 * порядок фаз и объёмы данных оставлены как в дефолте либы.
 */
const MEASUREMENTS: MeasurementConfig[] = [
  { type: 'latency', numPackets: 1 },
  { type: 'download', bytes: 1e5, count: 1, bypassMinDuration: true },
  { type: 'latency', numPackets: 20 },
  { type: 'download', bytes: 1e5, count: 9 },
  { type: 'download', bytes: 1e6, count: 8 },
  { type: 'upload', bytes: 1e5, count: 8 },
  { type: 'upload', bytes: 1e6, count: 6 },
  { type: 'download', bytes: 1e7, count: 6 },
  { type: 'upload', bytes: 1e7, count: 4 },
  { type: 'download', bytes: 25e6, count: 4 },
  { type: 'upload', bytes: 25e6, count: 4 }
]

interface SpeedtestState {
  phase: SpeedtestPhase
  running: boolean
  current: SpeedtestResult
  error: string | null
  netInfo: NetworkInfo | null
  netInfoLoading: boolean
  history: SpeedtestHistoryEntry[]

  loadNetworkInfo: () => Promise<void>
  start: () => void
  stop: () => void
  clearHistory: () => void
}

/** Движок держим вне стора — это ресурс, а не сериализуемое состояние. */
let engine: SpeedTestEngine | null = null

/** Снятие глобальных перехватчиков ошибок (ставятся на время замера). */
let detachGlobalHandlers: (() => void) | null = null

/**
 * Вешает временные window-перехватчики, чтобы поймать ошибки движка,
 * которые всплывают асинхронно (unhandledrejection) и не доходят до
 * onError / try-catch. Логируем полный стек — это и есть диагностика
 * «теста, который молча обрывается». Возвращает функцию снятия.
 */
function attachGlobalHandlers(): () => void {
  const onRejection = (e: PromiseRejectionEvent): void => {
    console.error(LOG, 'unhandledrejection during test:', e.reason)
  }
  const onError = (e: ErrorEvent): void => {
    console.error(LOG, 'window error during test:', e.message, e.error)
  }
  window.addEventListener('unhandledrejection', onRejection)
  window.addEventListener('error', onError)
  return () => {
    window.removeEventListener('unhandledrejection', onRejection)
    window.removeEventListener('error', onError)
  }
}

function disposeEngine(): void {
  if (detachGlobalHandlers) {
    detachGlobalHandlers()
    detachGlobalHandlers = null
  }
  if (engine) {
    try {
      engine.pause()
    } catch {
      /* движок мог уже завершиться */
    }
    engine = null
  }
}

export const useSpeedtestStore = create<SpeedtestState>((set, get) => ({
  phase: 'idle',
  running: false,
  current: {},
  error: null,
  netInfo: null,
  netInfoLoading: false,
  history: [],

  loadNetworkInfo: async () => {
    set({ netInfoLoading: true })
    try {
      const res = await window.netpulse.speedtest.getNetworkInfo()
      if (res.ok) {
        console.info(LOG, 'network info:', res.data)
        set({ netInfo: res.data, netInfoLoading: false })
      } else {
        console.warn(LOG, 'network info error:', res.error)
        set({ netInfo: null, netInfoLoading: false })
      }
    } catch (err) {
      console.error(LOG, 'network info threw:', err)
      set({ netInfo: null, netInfoLoading: false })
    }
  },

  start: () => {
    if (get().running) return
    disposeEngine()

    console.info(LOG, 'start')
    set({ running: true, phase: 'latency', current: {}, error: null })

    try {
      engine = new SpeedTestEngine({
        autoStart: false,
        // отключаем фоновый лог на aim.cloudflare.com
        logAimApiUrl: null,
        // свой набор измерений без packetLoss (см. MEASUREMENTS выше)
        measurements: MEASUREMENTS
      })
    } catch (err) {
      // Конструктор может бросить, если окружение без нужных Web API.
      const message = err instanceof Error ? err.message : String(err)
      console.error(LOG, 'engine construction failed:', err)
      set({ running: false, phase: 'error', error: message })
      return
    }

    engine.onPhaseChange = ({ measurementId, measurement }): void => {
      console.debug(LOG, 'phase change', measurementId, measurement.type)
    }

    engine.onResultsChange = ({ type }): void => {
      if (!engine) return
      const s = engine.results.getSummary()
      const phase = phaseFromType(type)
      console.debug(LOG, 'results', type, {
        dl: s.download,
        ul: s.upload,
        lat: s.latency,
        jit: s.jitter
      })
      set({
        ...(phase ? { phase } : {}),
        current: {
          downloadMbps: toMbps(s.download),
          uploadMbps: toMbps(s.upload),
          pingMs: s.latency,
          jitterMs: s.jitter
        }
      })
    }

    engine.onFinish = (results): void => {
      const s = results.getSummary()
      console.info(LOG, 'finish', s)
      const result: SpeedtestResult = {
        downloadMbps: toMbps(s.download),
        uploadMbps: toMbps(s.upload),
        pingMs: s.latency,
        jitterMs: s.jitter
      }
      const info = get().netInfo
      const entry: SpeedtestHistoryEntry = {
        ...result,
        id:
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : String(Date.now()),
        timestamp: Date.now(),
        ip: info?.ip,
        isp: info?.isp
      }
      set((st) => ({
        running: false,
        phase: 'done',
        current: result,
        history: [entry, ...st.history].slice(0, 50)
      }))
      disposeEngine()
    }

    engine.onError = (message): void => {
      console.error(LOG, 'engine error:', message)
      // Если успели получить хоть какие-то полезные метрики — не считаем
      // тест полностью проваленным: показываем то, что есть, и помечаем done.
      const cur = get().current
      const hasUsefulData =
        cur.downloadMbps != null || cur.uploadMbps != null || cur.pingMs != null
      if (hasUsefulData) {
        console.warn(LOG, 'error after partial data — finishing with what we have')
        set({ running: false, phase: 'done' })
      } else {
        set({ running: false, phase: 'error', error: message })
      }
      disposeEngine()
    }

    // Движок Cloudflare измеряет скорость через Performance Resource Timing
    // и делает fetch в микротасках. Если запрос падает или отсутствует
    // performance-запись, ошибка всплывает как unhandledrejection и НЕ
    // попадает в try/catch вокруг play(). Ставим временные глобальные
    // перехватчики, чтобы залогировать полный стек и не дать ошибке
    // «молча» оборвать тест. Снимаем их в disposeEngine().
    detachGlobalHandlers = attachGlobalHandlers()

    try {
      engine.play()
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(LOG, 'play() threw:', err)
      set({ running: false, phase: 'error', error: message })
      disposeEngine()
    }
  },

  stop: () => {
    console.info(LOG, 'stop')
    disposeEngine()
    set({ running: false, phase: 'idle' })
  },

  clearHistory: () => set({ history: [] })
}))