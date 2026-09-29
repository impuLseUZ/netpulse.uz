/**
 * TracerPage — страница трассировки маршрута (Модуль 2).
 *
 * v2: убран график (заменён inline-баром задержки), улучшена таблица,
 * добавлены: пустое состояние, индикатор мониторинга, копирование IP,
 * экспорт в CSV, подсветка строк с потерями, счётчик пакетов.
 */

import { useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Play, Square, Download, Route, CheckCircle2 } from 'lucide-react'
import { useTracerStore } from '@/store/tracer'
import { Button, Input, CopyButton, EmptyState, PulseTrace, MetricSecondary, TableShell, Table, THead, TH } from '@/components/ui'
import type { TraceHop } from '@shared/trace-types'

// ── Утилиты ───────────────────────────────────────────────────────────────────

function fmtMs(v: number | undefined): string {
  return v == null ? '—' : `${v}`
}

function fmtLoss(v: number): string {
  return `${v}%`
}

/** Экспортирует таблицу хопов в CSV и скачивает. */
function exportCsv(hops: TraceHop[], target: string): void {
  const header = ['#', 'IP', 'Hostname', 'Loss%', 'Last(ms)', 'Avg(ms)', 'Min(ms)', 'Max(ms)', 'Jitter(ms)', 'Sent', 'Received']
  const lines = hops.map((h) =>
    [h.hop, h.ip ?? '', h.hostname ?? '', h.lossPercent, h.lastMs ?? '', h.avg ?? '', h.min ?? '', h.max ?? '', h.jitter ?? '', h.sent, h.received].join(
      ','
    )
  )
  const csv = [header.join(','), ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `netpulse-trace-${target.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Компонент: inline-бар задержки ────────────────────────────────────────────

/**
 * Горизонтальный бар, визуально показывающий задержку относительно max по всей трассе.
 * Цвет: зелёный <50ms, жёлтый <150ms, красный >150ms.
 */
function LatencyBar({ ms, maxMs }: { ms: number | undefined; maxMs: number }): JSX.Element {
  if (ms == null || maxMs === 0) {
    return <div className="w-16 h-1.5 rounded-full bg-surface-2" />
  }
  const pct = Math.min((ms / maxMs) * 100, 100)
  const color = ms < 50 ? 'bg-ok' : ms < 150 ? 'bg-warn' : 'bg-danger'
  return (
    <div className="w-16 h-1.5 rounded-full bg-surface-2 overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-[width] duration-300 ease-out`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// ── Компонент: строка хопа ────────────────────────────────────────────────────

function HopRow({ hop, maxMs }: { hop: TraceHop; maxMs: number }): JSX.Element {
  const { t } = useTranslation()

  const isNoReply = !hop.ip
  const hasLoss = hop.lossPercent > 0
  const isBadLoss = hop.lossPercent >= 50

  const lossCls = isBadLoss ? 'text-danger font-semibold' : hasLoss ? 'text-warn' : 'text-muted'
  const rowCls = isBadLoss ? 'border-t border-border bg-danger/5' : 'border-t border-border hover:bg-surface-2/60 transition-colors'

  return (
    <tr className={rowCls}>
      <td className="px-3 py-2 text-muted text-xs w-8">{hop.hop}</td>

      <td className="px-3 py-2">
        {isNoReply ? (
          <span className="text-muted text-sm">{t('tracer.noReply')}</span>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-sm">{hop.ip}</span>
            {hop.hostname && <span className="text-muted text-xs truncate max-w-[200px]">· {hop.hostname}</span>}
            <CopyButton value={hop.ip!} className="opacity-0 group-hover:opacity-100 ml-auto shrink-0" size={12} />
          </div>
        )}
      </td>

      <td className={`px-3 py-2 text-right text-sm font-mono tabular-nums ${lossCls}`}>{fmtLoss(hop.lossPercent)}</td>

      <td className="px-3 py-2">
        <LatencyBar ms={hop.lastMs} maxMs={maxMs} />
      </td>

      <td className="px-3 py-2 text-right font-mono tabular-nums text-sm">{fmtMs(hop.lastMs)}</td>
      <td className="px-3 py-2 text-right font-mono tabular-nums text-sm text-muted">{fmtMs(hop.avg)}</td>
      <td className="px-3 py-2 text-right font-mono tabular-nums text-sm text-muted">{fmtMs(hop.min)}</td>
      <td className="px-3 py-2 text-right font-mono tabular-nums text-sm text-muted">{fmtMs(hop.max)}</td>
      <td className="px-3 py-2 text-right font-mono tabular-nums text-sm text-muted">{fmtMs(hop.jitter)}</td>

      <td className="px-3 py-2 text-right text-xs font-mono tabular-nums text-muted">{isNoReply ? '—' : `${hop.received}/${hop.sent}`}</td>
    </tr>
  )
}

// ── Главный компонент ─────────────────────────────────────────────────────────

export function TracerPage(): JSX.Element {
  const { t } = useTranslation()
  const { target, running, method, resolvedIp, hops, error, lastUpdated, setTarget, start, stop } = useTracerStore()

  // Останавливаем мониторинг при уходе со страницы
  useEffect(() => {
    return () => {
      if (useTracerStore.getState().running) {
        void useTracerStore.getState().stop()
      }
    }
  }, [])

  const handleStart = useCallback(() => void start(), [start])
  const handleStop = useCallback(() => void stop(), [stop])

  // Максимальная задержка по всем хопам (для нормализации баров)
  const maxMs = hops.reduce((m, h) => (h.lastMs != null ? Math.max(m, h.lastMs) : m), 0)

  // Статистика по трассе
  const totalHops = hops.filter((h) => h.ip).length
  const hopsWithLoss = hops.filter((h) => h.ip && h.lossPercent > 0).length
  const lastHop = hops[hops.length - 1]

  const hasResults = hops.length > 0

  return (
    <div className="p-6 max-w-6xl mx-auto w-full">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2.5">
          <Route size={18} className="text-accent" />
          {t('nav.tracer')}
        </h2>

        {hasResults && !running && (
          <Button size="sm" variant="secondary" onClick={() => exportCsv(hops, target)}>
            <Download size={13} />
            CSV
          </Button>
        )}
      </div>

      {/* Строка ввода + кнопка */}
      <div className="flex gap-2 mb-4">
        <Input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !running) handleStart()
          }}
          placeholder={t('tracer.targetPlaceholder')}
          disabled={running}
        />
        {!running ? (
          <Button variant="primary" onClick={handleStart} disabled={!target.trim()} className="px-5">
            <Play size={15} />
            {t('tracer.start')}
          </Button>
        ) : (
          <Button variant="danger" onClick={handleStop} className="px-5">
            <Square size={15} />
            {t('tracer.stop')}
          </Button>
        )}
      </div>

      {/* Статус-строка */}
      {(method || running) && (
        <div className="flex items-center gap-3 text-xs text-muted mb-4">
          {running && (
            <span className="flex items-center gap-1.5 text-ok">
              <PulseTrace width={28} height={11} color="ok" />
              мониторинг
            </span>
          )}
          {!running && hasResults && (
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-ok" />
              <span className="text-ok">завершено</span>
            </span>
          )}

          {resolvedIp && <span className="font-mono">{resolvedIp}</span>}

          {method && (
            <span className={method === 'raw' ? 'text-ok' : 'text-warn'}>
              {method === 'raw' ? t('tracer.methodRaw') : t('tracer.methodSystem')}
            </span>
          )}

          {lastUpdated && <span className="ml-auto font-mono tabular-nums">обновлено {new Date(lastUpdated).toLocaleTimeString()}</span>}
        </div>
      )}

      {/* Ошибка */}
      {error && <div className="mb-4 px-4 py-3 rounded-control bg-danger/10 border border-danger/30 text-sm text-danger">{error}</div>}

      {/* Сводка по трассе (показывается когда есть результаты) */}
      {hasResults && (
        <div className="grid grid-cols-4 gap-2 mb-4">
          <MetricSecondary label="Хопов" value={String(totalHops)} />
          <MetricSecondary label="С потерями" value={String(hopsWithLoss)} active={hopsWithLoss > 0} />
          <MetricSecondary label="Задержка (конечный)" value={lastHop?.lastMs != null ? String(lastHop.lastMs) : '—'} unit="мс" />
          <MetricSecondary label="Avg (конечный)" value={lastHop?.avg != null ? String(lastHop.avg) : '—'} unit="мс" />
        </div>
      )}

      {/* Таблица хопов */}
      {hasResults && (
        <TableShell>
          <Table>
            <THead>
              <tr className="sticky top-0">
                <TH className="w-8">#</TH>
                <TH>{t('tracer.host')}</TH>
                <TH className="text-right">{t('tracer.loss')}</TH>
                <TH className="w-20"></TH>
                <TH className="text-right">{t('tracer.last')}</TH>
                <TH className="text-right">avg</TH>
                <TH className="text-right">min</TH>
                <TH className="text-right">max</TH>
                <TH className="text-right">{t('tracer.jitter')}</TH>
                <TH className="text-right">recv/sent</TH>
              </tr>
            </THead>
            <tbody className="group">
              {hops.map((h) => (
                <HopRow key={h.hop} hop={h} maxMs={maxMs} />
              ))}
            </tbody>
          </Table>
        </TableShell>
      )}

      {/* Пустое состояние — до первого запуска */}
      {!hasResults && !running && !error && (
        <EmptyState icon={Route} title="Введите хост или IP и нажмите «Трассировать»" hint="Например: google.com, 8.8.8.8, mover.uz" />
      )}

      {/* Состояние загрузки — ждём первых хопов */}
      {!hasResults && running && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex gap-1 mb-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: `${i * 120}ms` }} />
            ))}
          </div>
          <p className="text-sm text-muted">Построение маршрута…</p>
        </div>
      )}
    </div>
  )
}
