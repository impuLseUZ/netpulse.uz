/**
 * Zustand store модуля Speedtest (Модуль 6) — renderer.
 *
 * Логика выбора метода замера:
 *
 *   runPreflight()
 *     ↓
 *   hint === 'ok'             → @cloudflare/speedtest (точный)
 *   hint === 'timing_blocked' → HTTP fallback + useCfDown=true
 *   hint === 'cf_blocked'     → HTTP fallback + useCfDown=false (только CDN)
 *   hint === 'ssl_error'      → блокируем, предупреждение о MITM
 *   hint === 'no_internet'    → ошибка «нет интернета»
 *
 * IP для шапки: приходит через IPC из main (getNetworkInfo).
 * Если main тоже не достучался до Cloudflare — IP берём из preflight-запроса
 * (renderer уже получил ответ от CF во время диагностики).
 */

import { create } from 'zustand'
import SpeedTestEngine, { type MeasurementConfig } from '@cloudflare/speedtest'
import { runPreflight, type PreflightResult, type FirewallHint } from '@/lib/speedtest-preflight'
import { runHttpFallbackSpeedtest } from '@/lib/speedtest-http-fallback'
import type {
  NetworkInfo,
  SpeedtestPhase,
  SpeedtestResult,
  SpeedtestHistoryEntry,
} from '@shared/speedtest-types'

const LOG = '[speedtest]'

function toMbps(bps: number | undefined): number | undefined {
  return bps == null ? undefined : bps / 1e6
}

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

/** Измерения без packetLoss (WebRTC TURN UDP:50000 — заблокирован в корп. сетях). */
const MEASUREMENTS: MeasurementConfig[] = [
  { type: 'latency',  numPackets: 1 },
  { type: 'download', bytes: 1e5,  count: 1,  bypassMinDuration: true },
  { type: 'latency',  numPackets: 20 },
  { type: 'download', bytes: 1e5,  count: 9 },
  { type: 'download', bytes: 1e6,  count: 8 },
  { type: 'upload',   bytes: 1e5,  count: 8 },
  { type: 'upload',   bytes: 1e6,  count: 6 },
  { type: 'download', bytes: 1e7,  count: 6 },
  { type: 'upload',   bytes: 1e7,  count: 4 },
  { type: 'download', bytes: 25e6, count: 4 },
  { type: 'upload',   bytes: 25e6, count: 4 },
]

// ── Глобальное состояние движка (вне стора) ───────────────────────────────────

let engine: SpeedTestEngine | null = null
let detachGlobalHandlers: (() => void) | null = null
let lastUiUpdate = 0
const UI_THROTTLE_MS = 100
let aborted = false

function attachGlobalHandlers(): () => void {
  const handler = (ev: PromiseRejectionEvent): void => {
    console.error(LOG, 'unhandledrejection during speedtest:', ev.reason)
  }
  window.addEventListener('unhandledrejection', handler)
  return () => window.removeEventListener('unhandledrejection', handler)
}

function disposeEngine(): void {
  if (detachGlobalHandlers) {
    detachGlobalHandlers()
    detachGlobalHandlers = null
  }
  if (engine) {
    try { engine.pause() } catch { /* ignore */ }
    engine = null
  }
  aborted = true
}

// ── Типы стора ────────────────────────────────────────────────────────────────

interface SpeedtestState {
  phase: SpeedtestPhase
  running: boolean
  current: SpeedtestResult
  error: string | null
  netInfo: NetworkInfo | null
  netInfoLoading: boolean
  history: SpeedtestHistoryEntry[]
  preflight: PreflightResult | null
  usedFallback: boolean

  loadNetworkInfo: () => Promise<void>
  start: () => void
  stop: () => void
  clearHistory: () => void
}

// ── Стор ──────────────────────────────────────────────────────────────────────

export const useSpeedtestStore = create<SpeedtestState>((set, get) => ({
  phase: 'idle',
  running: false,
  current: {},
  error: null,
  netInfo: null,
  netInfoLoading: false,
  history: [],
  preflight: null,
  usedFallback: false,

  loadNetworkInfo: async () => {
    set({ netInfoLoading: true })
    try {
      const result = await window.netpulse.speedtest.getNetworkInfo()
      if (result.ok && result.data) {
        set({ netInfo: result.data as NetworkInfo })
        console.info(LOG, 'netInfo from IPC:', result.data)
        return
      }
      // IPC вернул ошибку (main тоже не достучался до CF)
      console.warn(LOG, 'getNetworkInfo IPC error:', result.error)
    } catch (err) {
      console.warn(LOG, 'getNetworkInfo threw:', err)
    } finally {
      set({ netInfoLoading: false })
    }
    // Fallback: пробуем получить IP прямо из renderer через те же источники
    await loadNetworkInfoFallback(set)
  },

  start: () => {
    if (get().running) return

    aborted = false
    lastUiUpdate = 0

    set({
      running: true,
      phase: 'preflight',
      current: {},
      error: null,
      usedFallback: false,
      preflight: null,
    })

    void startAsync(get, set)
  },

  stop: () => {
    console.info(LOG, 'stop')
    disposeEngine()
    set({ running: false, phase: 'idle' })
  },

  clearHistory: () => set({ history: [] }),
}))

/**
 * Если main не смог получить IP (Cloudflare заблокирован на уровне сети),
 * пробуем получить его из renderer — через те же источники.
 * Renderer может иметь доступ через браузерный стек даже когда Node fetch из main нет.
 */
async function loadNetworkInfoFallback(
  set: (partial: Partial<SpeedtestState>) => void,
): Promise<void> {
  set({ netInfoLoading: true })
  try {
    // Пробуем ip-api.com (HTTP — обходит SSL-inspection)
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 5000)
    try {
      const res = await fetch('http://ip-api.com/json?fields=status,query,country,countryCode,isp', {
        signal: ctrl.signal,
        cache: 'no-store',
      })
      clearTimeout(timer)
      if (res.ok) {
        const data = await res.json() as Record<string, unknown>
        if (data['status'] === 'success' && data['query']) {
          const info: NetworkInfo = {
            ip: String(data['query']),
            isp: data['isp'] ? String(data['isp']) : undefined,
            country: data['countryCode'] ? String(data['countryCode']) : undefined,
          }
          console.info(LOG, 'netInfo from renderer fallback (ip-api):', info)
          set({ netInfo: info })
          return
        }
      }
    } finally {
      clearTimeout(timer)
    }
  } catch (err) {
    console.warn(LOG, 'renderer IP fallback failed:', err)
  } finally {
    set({ netInfoLoading: false })
  }
}

// ── Асинхронная логика запуска ────────────────────────────────────────────────

async function startAsync(
  get: () => SpeedtestState,
  set: (partial: Partial<SpeedtestState> | ((s: SpeedtestState) => Partial<SpeedtestState>)) => void,
): Promise<void> {
  // Preflight
  let preflight: PreflightResult
  try {
    console.info(LOG, 'running preflight...')
    preflight = await runPreflight()
    console.info(LOG, 'preflight result:', preflight)
  } catch (err) {
    console.error(LOG, 'preflight threw unexpectedly:', err)
    preflight = { hint: 'unknown', canUsePrimary: true, canUseFallback: true }
  }

  if (aborted) return

  set({ preflight, phase: 'latency' })

  // Если preflight получил IP из CF и у нас нет netInfo — подставляем
  // (это происходит когда main не смог достучаться, но renderer смог)
  if (!get().netInfo && preflight.hint === 'ok') {
    void loadNetworkInfoFallback(set)
  }

  const { hint, canUsePrimary, canUseFallback } = preflight

  if (hint === 'no_internet') {
    set({ running: false, phase: 'error', error: 'no_internet' })
    return
  }

  if (hint === 'ssl_error') {
    set({ running: false, phase: 'error', error: 'ssl_error' })
    return
  }

  if (canUsePrimary) {
    console.info(LOG, 'using Cloudflare engine')
    runCloudflareEngine(get, set)
  } else if (canUseFallback) {
    const useCfDown = hint === 'timing_blocked'
    console.info(LOG, 'using HTTP fallback, useCfDown:', useCfDown)
    set({ usedFallback: true })
    await runFallback(useCfDown, get, set)
  } else {
    set({ running: false, phase: 'error', error: hint })
  }
}

// ── Cloudflare engine ─────────────────────────────────────────────────────────

function runCloudflareEngine(
  get: () => SpeedtestState,
  set: (partial: Partial<SpeedtestState> | ((s: SpeedtestState) => Partial<SpeedtestState>)) => void,
): void {
  try {
    engine = new SpeedTestEngine({ measurements: MEASUREMENTS })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(LOG, 'engine construction failed:', err)
    set({ running: false, phase: 'error', error: msg })
    return
  }

  engine.onPhaseChange = ({ measurementId, measurement }) => {
    console.debug(LOG, 'phase change', measurementId, measurement.type)
  }

  engine.onResultsChange = ({ type }) => {
    if (!engine) return
    const phase = phaseFromType(type)
    const now = Date.now()
    if (phase === null && now - lastUiUpdate < UI_THROTTLE_MS) return
    lastUiUpdate = now
    const s = engine.results.getSummary()
    set({
      ...(phase ? { phase } : {}),
      current: {
        downloadMbps: toMbps(s.download),
        uploadMbps:   toMbps(s.upload),
        pingMs:        s.latency,
        jitterMs:      s.jitter,
      },
    })
  }

  engine.onFinish = (results) => {
    const s = results.getSummary()
    console.info(LOG, 'finish', s)
    const result: SpeedtestResult = {
      downloadMbps: toMbps(s.download),
      uploadMbps:   toMbps(s.upload),
      pingMs:        s.latency,
      jitterMs:      s.jitter,
    }
    saveToHistory(result, false, get, set)
    disposeEngine()
  }

  engine.onError = (message) => {
    console.error(LOG, 'engine error:', message)
    const cur = get().current
    const hasData = cur.downloadMbps != null || cur.uploadMbps != null || cur.pingMs != null
    if (hasData) {
      console.warn(LOG, 'error after partial data — saving what we have')
      saveToHistory(cur, false, get, set)
    } else {
      set({ running: false, phase: 'error', error: message })
    }
    disposeEngine()
  }

  detachGlobalHandlers = attachGlobalHandlers()

  try {
    engine.play()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(LOG, 'play() threw:', err)
    set({ running: false, phase: 'error', error: msg })
    disposeEngine()
  }
}

// ── HTTP Fallback ─────────────────────────────────────────────────────────────

async function runFallback(
  useCfDown: boolean,
  get: () => SpeedtestState,
  set: (partial: Partial<SpeedtestState> | ((s: SpeedtestState) => Partial<SpeedtestState>)) => void,
): Promise<void> {
  try {
    const result = await runHttpFallbackSpeedtest(
      (partial, phase) => {
        if (aborted) return
        const now = Date.now()
        if (now - lastUiUpdate < UI_THROTTLE_MS) return
        lastUiUpdate = now
        set({ current: partial, phase: phase as SpeedtestPhase })
      },
      useCfDown,
    )
    if (aborted) return
    saveToHistory(result, true, get, set)
  } catch (err) {
    if (aborted) return
    const msg = err instanceof Error ? err.message : String(err)
    console.error(LOG, 'fallback error:', err)
    set({ running: false, phase: 'error', error: msg })
  }
}

// ── Общий финиш ──────────────────────────────────────────────────────────────

function saveToHistory(
  result: SpeedtestResult,
  isFallback: boolean,
  get: () => SpeedtestState,
  set: (partial: Partial<SpeedtestState> | ((s: SpeedtestState) => Partial<SpeedtestState>)) => void,
): void {
  const info = get().netInfo
  const entry: SpeedtestHistoryEntry = {
    ...result,
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : String(Date.now()),
    timestamp: Date.now(),
    ip:  info?.ip,
    isp: info?.isp,
    isFallback,
  }
  set((st) => ({
    running: false,
    phase: 'done',
    current: result,
    usedFallback: isFallback,
    history: [entry, ...st.history].slice(0, 50),
  }))
}