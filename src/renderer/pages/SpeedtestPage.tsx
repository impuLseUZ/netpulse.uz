import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Play, Square, Trash2, Download, Gauge, Wifi } from 'lucide-react'
import { useSpeedtestStore } from '@/store/speedtest'
import type { SpeedtestHistoryEntry, SpeedtestPhase } from '@shared/speedtest-types'

/** Верхняя граница спидометра (Мбит/с) для отрисовки дуги. */
const GAUGE_MAX = 1000

/** Логарифмическая шкала: типичные значения (1..1000) распределены ровнее. */
function gaugeFraction(mbps: number): number {
  if (mbps <= 0) return 0
  const f = Math.log10(mbps + 1) / Math.log10(GAUGE_MAX + 1)
  return Math.max(0, Math.min(1, f))
}

function fmt(n: number | undefined, digits = 1): string {
  return n == null ? '—' : n.toFixed(digits)
}

/** Полукруговой спидометр на SVG. Цвета — через токены тем. */
function Speedometer({
  value,
  phase
}: {
  value: number | undefined
  phase: SpeedtestPhase
}): JSX.Element {
  const r = 120
  const cx = 150
  const cy = 150
  const frac = value != null ? gaugeFraction(value) : 0
  // Полукруг: угол от 180° (слева) до 0° (справа).
  const angle = Math.PI * (1 - frac)
  const x = cx + r * Math.cos(angle)
  const y = cy - r * Math.sin(angle)
  const largeArc = frac > 0.5 ? 1 : 0

  const trackPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`
  const valuePath =
    frac > 0 ? `M ${cx - r} ${cy} A ${r} ${r} 0 ${largeArc} 1 ${x} ${y}` : ''

  const active = phase === 'download' || phase === 'upload'

  return (
    <svg viewBox="0 0 300 170" className="w-full max-w-sm">
      <path
        d={trackPath}
        fill="none"
        stroke="rgb(var(--surface-2))"
        strokeWidth={16}
        strokeLinecap="round"
      />
      {valuePath && (
        <path
          d={valuePath}
          fill="none"
          stroke={active ? 'rgb(var(--accent))' : 'rgb(var(--ok))'}
          strokeWidth={16}
          strokeLinecap="round"
        />
      )}
      <text
        x={cx}
        y={cy - 18}
        textAnchor="middle"
        className="fill-current"
        style={{ fontSize: 38, fontWeight: 700, fill: 'rgb(var(--accent))' }}
      >
        {fmt(value)}
      </text>
      <text
        x={cx}
        y={cy + 6}
        textAnchor="middle"
        style={{ fontSize: 13, fill: 'rgb(var(--muted))' }}
      >
        Mbps
      </text>
    </svg>
  )
}

function MetricCard({
  label,
  value,
  unit,
  highlight
}: {
  label: string
  value: string
  unit: string
  highlight?: boolean
}): JSX.Element {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 text-center">
      <div className="text-xs text-muted mb-1">{label}</div>
      <div
        className={`text-2xl font-semibold ${highlight ? 'text-accent' : ''}`}
      >
        {value}
        <span className="text-sm text-muted ml-1">{unit}</span>
      </div>
    </div>
  )
}

/** Экспорт истории сессии в CSV (локально, без общего util). */
function exportHistoryCsv(rows: SpeedtestHistoryEntry[]): void {
  const header = ['time', 'download_mbps', 'upload_mbps', 'ping_ms', 'jitter_ms', 'ip', 'isp']
  const lines = rows.map((r) =>
    [
      new Date(r.timestamp).toISOString(),
      r.downloadMbps?.toFixed(2) ?? '',
      r.uploadMbps?.toFixed(2) ?? '',
      r.pingMs?.toFixed(1) ?? '',
      r.jitterMs?.toFixed(1) ?? '',
      r.ip ?? '',
      (r.isp ?? '').replace(/[;,]/g, ' ')
    ].join(',')
  )
  const csv = [header.join(','), ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `netpulse-speedtest-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function SpeedtestPage(): JSX.Element {
  const { t } = useTranslation()
  const {
    phase,
    running,
    current,
    error,
    netInfo,
    netInfoLoading,
    history,
    loadNetworkInfo,
    start,
    stop,
    clearHistory
  } = useSpeedtestStore()

  useEffect(() => {
    void loadNetworkInfo()
    return () => {
      // Останавливаем активный замер при уходе со страницы.
      if (useSpeedtestStore.getState().running) useSpeedtestStore.getState().stop()
    }
  }, [loadNetworkInfo])

  // Значение для спидометра: во время upload показываем upload, иначе download.
  const gaugeValue = useMemo(() => {
    if (phase === 'upload') return current.uploadMbps
    return current.downloadMbps
  }, [phase, current.downloadMbps, current.uploadMbps])

  const phaseLabel = running
    ? t(`speedtest.phase.${phase}`, { defaultValue: '' })
    : phase === 'done'
      ? t('speedtest.phase.done')
      : phase === 'error'
        ? t('speedtest.phase.error')
        : ''

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
        <Gauge size={20} /> {t('nav.speedtest')}
      </h2>

      {/* Шапка: внешний IP / провайдер */}
      <div className="flex items-center gap-2 text-xs text-muted mb-6">
        <Wifi size={14} />
        {netInfoLoading ? (
          <span>{t('speedtest.detecting')}</span>
        ) : netInfo?.ip ? (
          <span className="font-mono">
            {netInfo.ip}
            {netInfo.isp && <span className="text-muted"> · {netInfo.isp}</span>}
            {netInfo.country && <span className="text-muted"> · {netInfo.country}</span>}
          </span>
        ) : (
          <span>{t('speedtest.noNetInfo')}</span>
        )}
      </div>

      {/* Спидометр + кнопка */}
      <div className="rounded-lg border border-border bg-surface p-6 flex flex-col items-center mb-4">
        <Speedometer value={gaugeValue} phase={phase} />

        <div className="h-5 text-xs text-muted mt-1 mb-4">{phaseLabel}</div>

        {!running ? (
          <button
            onClick={start}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-accent text-accent-fg text-sm font-medium"
          >
            <Play size={16} />
            {phase === 'done' || phase === 'error'
              ? t('speedtest.restart')
              : t('speedtest.start')}
          </button>
        ) : (
          <button
            onClick={stop}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-danger text-white text-sm font-medium"
          >
            <Square size={16} />
            {t('speedtest.stop')}
          </button>
        )}

        {phase === 'error' && error && (
          <p className="text-xs text-danger mt-3 text-center max-w-md">{error}</p>
        )}
      </div>

      {/* Метрики */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <MetricCard
          label={t('speedtest.download')}
          value={fmt(current.downloadMbps)}
          unit="Mbps"
          highlight={phase === 'download'}
        />
        <MetricCard
          label={t('speedtest.upload')}
          value={fmt(current.uploadMbps)}
          unit="Mbps"
          highlight={phase === 'upload'}
        />
        <MetricCard label={t('speedtest.ping')} value={fmt(current.pingMs)} unit="ms" />
        <MetricCard label={t('speedtest.jitter')} value={fmt(current.jitterMs)} unit="ms" />
      </div>

      {/* История сессии */}
      {history.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">{t('speedtest.history')}</h3>
            <div className="flex gap-2">
              <button
                onClick={() => exportHistoryCsv(history)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs hover:bg-surface-2"
              >
                <Download size={14} /> CSV
              </button>
              <button
                onClick={clearHistory}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs hover:bg-surface-2"
              >
                <Trash2 size={14} /> {t('speedtest.clear')}
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-surface overflow-hidden">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted bg-surface-2">
                <tr>
                  <th className="text-left font-medium px-3 py-2">{t('speedtest.time')}</th>
                  <th className="text-right font-medium px-3 py-2">↓ Mbps</th>
                  <th className="text-right font-medium px-3 py-2">↑ Mbps</th>
                  <th className="text-right font-medium px-3 py-2">{t('speedtest.ping')}</th>
                  <th className="text-right font-medium px-3 py-2">{t('speedtest.jitter')}</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-t border-border">
                    <td className="px-3 py-2 text-muted">
                      {new Date(h.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{fmt(h.downloadMbps)}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmt(h.uploadMbps)}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmt(h.pingMs)}</td>
                    <td className="px-3 py-2 text-right font-mono">{fmt(h.jitterMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}