import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Play, Square } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import { useTracerStore } from '@/store/tracer'
import type { TraceHop } from '@shared/trace-types'

export function TracerPage(): JSX.Element {
  const { t } = useTranslation()
  const {
    target,
    running,
    method,
    resolvedIp,
    hops,
    samples,
    selectedHop,
    setTarget,
    setSelectedHop,
    start,
    stop
  } = useTracerStore()

  // Данные для графика по выбранному хопу.
  const chartData = useMemo(() => {
    if (selectedHop == null) return []
    const arr = samples[selectedHop] ?? []
    return arr.map((p) => ({
      time: new Date(p.t).toLocaleTimeString(),
      ms: p.ms
    }))
  }, [samples, selectedHop])

  useEffect(() => {
    return () => {
      // Останавливаем мониторинг при уходе со страницы.
      if (useTracerStore.getState().running) void useTracerStore.getState().stop()
    }
  }, [])

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <h2 className="text-xl font-semibold mb-6">{t('nav.tracer')}</h2>

      <div className="flex gap-2 mb-4">
        <input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !running && void start()}
          placeholder={t('tracer.targetPlaceholder')}
          disabled={running}
          className="flex-1 px-4 py-2.5 rounded-lg bg-surface border border-border text-sm font-mono outline-none focus:border-accent disabled:opacity-60"
        />
        {!running ? (
          <button
            onClick={() => void start()}
            disabled={!target.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-accent-fg text-sm disabled:opacity-50"
          >
            <Play size={16} />
            {t('tracer.start')}
          </button>
        ) : (
          <button
            onClick={() => void stop()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-danger text-white text-sm"
          >
            <Square size={16} />
            {t('tracer.stop')}
          </button>
        )}
      </div>

      {method && (
        <p className="text-xs text-muted mb-4">
          {resolvedIp && <span className="font-mono">{resolvedIp} · </span>}
          <span className={method === 'raw' ? 'text-ok' : 'text-warn'}>
            {method === 'raw' ? t('tracer.methodRaw') : t('tracer.methodSystem')}
          </span>
        </p>
      )}

      {/* График по выбранному хопу */}
      {selectedHop != null && chartData.length > 1 && (
        <div className="mb-6 rounded-lg border border-border bg-surface p-4">
          <div className="text-xs text-muted mb-3">
            {t('tracer.chartTitle', { hop: selectedHop })}
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border))" />
              <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'rgb(var(--muted))' }} minTickGap={40} />
              <YAxis tick={{ fontSize: 10, fill: 'rgb(var(--muted))' }} width={40} unit="" />
              <Tooltip
                contentStyle={{
                  background: 'rgb(var(--surface))',
                  border: '1px solid rgb(var(--border))',
                  borderRadius: 8,
                  fontSize: 12
                }}
                labelStyle={{ color: 'rgb(var(--muted))' }}
              />
              <Line
                type="monotone"
                dataKey="ms"
                stroke="rgb(var(--accent))"
                strokeWidth={2}
                dot={false}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Таблица хопов */}
      {hops.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-muted text-xs">
              <tr>
                <th className="px-3 py-2 font-medium">#</th>
                <th className="px-3 py-2 font-medium">{t('tracer.host')}</th>
                <th className="px-3 py-2 font-medium text-right">{t('tracer.loss')}</th>
                <th className="px-3 py-2 font-medium text-right">{t('tracer.last')}</th>
                <th className="px-3 py-2 font-medium text-right">avg</th>
                <th className="px-3 py-2 font-medium text-right">min</th>
                <th className="px-3 py-2 font-medium text-right">max</th>
                <th className="px-3 py-2 font-medium text-right">{t('tracer.jitter')}</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {hops.map((h) => (
                <HopRow
                  key={h.hop}
                  hop={h}
                  selected={selectedHop === h.hop}
                  onSelect={() => setSelectedHop(h.hop)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function HopRow({
  hop,
  selected,
  onSelect
}: {
  hop: TraceHop
  selected: boolean
  onSelect: () => void
}): JSX.Element {
  const { t } = useTranslation()
  // Цвет по потерям: >50% красный, >0 жёлтый, иначе обычный.
  const lossCls =
    hop.lossPercent > 50 ? 'text-danger' : hop.lossPercent > 0 ? 'text-warn' : 'text-muted'
  return (
    <tr
      onClick={onSelect}
      className={[
        'border-t border-border cursor-pointer',
        selected ? 'bg-surface-2' : 'hover:bg-surface-2'
      ].join(' ')}
    >
      <td className="px-3 py-1.5 text-muted">{hop.hop}</td>
      <td className="px-3 py-1.5">
        {hop.ip ? (
          <span>
            {hop.ip}
            {hop.hostname && <span className="text-muted"> · {hop.hostname}</span>}
          </span>
        ) : (
          <span className="text-muted">{t('tracer.noReply')}</span>
        )}
      </td>
      <td className={`px-3 py-1.5 text-right ${lossCls}`}>{hop.lossPercent}%</td>
      <td className="px-3 py-1.5 text-right">{hop.lastMs ?? '—'}</td>
      <td className="px-3 py-1.5 text-right">{hop.avg ?? '—'}</td>
      <td className="px-3 py-1.5 text-right">{hop.min ?? '—'}</td>
      <td className="px-3 py-1.5 text-right">{hop.max ?? '—'}</td>
      <td className="px-3 py-1.5 text-right">{hop.jitter ?? '—'}</td>
    </tr>
  )
}
