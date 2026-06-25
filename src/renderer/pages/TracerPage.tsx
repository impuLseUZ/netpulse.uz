/**
 * TracerPage — страница трассировки маршрута (Модуль 2).
 *
 * v2: убран график (заменён inline-баром задержки), улучшена таблица,
 * добавлены: пустое состояние, индикатор мониторинга, копирование IP,
 * экспорт в CSV, подсветка строк с потерями, счётчик пакетов.
 */

import { useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Play, Square, Copy, Download, Route, CheckCircle2 } from 'lucide-react'
import { useTracerStore } from '@/store/tracer'
import type { TraceHop } from '@shared/trace-types'

// ── Утилиты ───────────────────────────────────────────────────────────────────

function fmtMs(v: number | undefined): string {
  return v == null ? '—' : `${v}`
}

function fmtLoss(v: number): string {
  return `${v}%`
}

/** Копирует текст в буфер обмена. */
async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
  } catch {
    /* ignore */
  }
}

/** Экспортирует таблицу хопов в CSV и скачивает. */
function exportCsv(hops: TraceHop[], target: string): void {
  const header = ['#', 'IP', 'Hostname', 'Loss%', 'Last(ms)', 'Avg(ms)', 'Min(ms)', 'Max(ms)', 'Jitter(ms)', 'Sent', 'Received']
  const lines = hops.map((h) => [
    h.hop,
    h.ip ?? '',
    h.hostname ?? '',
    h.lossPercent,
    h.lastMs ?? '',
    h.avg ?? '',
    h.min ?? '',
    h.max ?? '',
    h.jitter ?? '',
    h.sent,
    h.received,
  ].join(','))
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
  const color =
    ms < 50 ? 'bg-ok' : ms < 150 ? 'bg-warn' : 'bg-danger'
  return (
    <div className="w-16 h-1.5 rounded-full bg-surface-2 overflow-hidden">
      <div
        className={`h-full rounded-full ${color}`}
        style={{ width: `${pct}%`, transition: 'width 0.4s ease-out' }}
      />
    </div>
  )
}

// ── Компонент: строка хопа ────────────────────────────────────────────────────

function HopRow({
  hop,
  maxMs,
}: {
  hop: TraceHop
  maxMs: number
}): JSX.Element {
  const { t } = useTranslation()

  const isNoReply = !hop.ip
  const hasLoss = hop.lossPercent > 0
  const isBadLoss = hop.lossPercent >= 50

  const lossCls = isBadLoss
    ? 'text-danger font-semibold'
    : hasLoss
      ? 'text-warn'
      : 'text-muted'

  const rowCls = isBadLoss
    ? 'border-t border-border bg-danger/5'
    : 'border-t border-border hover:bg-surface-2/60'

  return (
    <tr className={rowCls}>
      {/* # */}
      <td className="px-3 py-2 text-muted text-xs w-8">{hop.hop}</td>

      {/* IP + hostname */}
      <td className="px-3 py-2">
        {isNoReply ? (
          <span className="text-muted text-sm">{t('tracer.noReply')}</span>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-mono text-sm">{hop.ip}</span>
            {hop.hostname && (
              <span className="text-muted text-xs truncate max-w-[200px]">
                · {hop.hostname}
              </span>
            )}
            <button
              onClick={() => void copyText(hop.ip!)}
              className="opacity-0 group-hover:opacity-100 text-muted hover:text-fg transition-opacity ml-auto shrink-0"
              title="Копировать IP"
            >
              <Copy size={12} />
            </button>
          </div>
        )}
      </td>

      {/* Потери */}
      <td className={`px-3 py-2 text-right text-sm ${lossCls}`}>
        {fmtLoss(hop.lossPercent)}
      </td>

      {/* Бар задержки */}
      <td className="px-3 py-2">
        <LatencyBar ms={hop.lastMs} maxMs={maxMs} />
      </td>

      {/* Last */}
      <td className="px-3 py-2 text-right font-mono text-sm">
        {fmtMs(hop.lastMs)}
      </td>

      {/* Avg */}
      <td className="px-3 py-2 text-right font-mono text-sm text-muted">
        {fmtMs(hop.avg)}
      </td>

      {/* Min */}
      <td className="px-3 py-2 text-right font-mono text-sm text-muted">
        {fmtMs(hop.min)}
      </td>

      {/* Max */}
      <td className="px-3 py-2 text-right font-mono text-sm text-muted">
        {fmtMs(hop.max)}
      </td>

      {/* Jitter */}
      <td className="px-3 py-2 text-right font-mono text-sm text-muted">
        {fmtMs(hop.jitter)}
      </td>

      {/* Sent/Recv */}
      <td className="px-3 py-2 text-right text-xs text-muted">
        {isNoReply ? '—' : `${hop.received}/${hop.sent}`}
      </td>
    </tr>
  )
}

// ── Главный компонент ─────────────────────────────────────────────────────────

export function TracerPage(): JSX.Element {
  const { t } = useTranslation()
  const {
    target,
    running,
    method,
    resolvedIp,
    hops,
    error,
    lastUpdated,
    setTarget,
    start,
    stop,
    reset,
  } = useTracerStore()

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
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Route size={20} />
          {t('nav.tracer')}
        </h2>

        {/* Кнопка экспорта CSV */}
        {hasResults && !running && (
          <button
            onClick={() => exportCsv(hops, target)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border text-xs hover:bg-surface-2 text-muted transition-colors"
          >
            <Download size={13} />
            CSV
          </button>
        )}
      </div>

      {/* Строка ввода + кнопка */}
      <div className="flex gap-2 mb-4">
        <input
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !running) handleStart()
          }}
          placeholder={t('tracer.targetPlaceholder')}
          disabled={running}
          className="flex-1 px-4 py-2.5 rounded-lg bg-surface border border-border text-sm font-mono outline-none focus:border-accent disabled:opacity-60 transition-colors"
        />
        {!running ? (
          <button
            onClick={handleStart}
            disabled={!target.trim()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-accent-fg text-sm font-medium disabled:opacity-50 transition-opacity"
          >
            <Play size={15} />
            {t('tracer.start')}
          </button>
        ) : (
          <button
            onClick={handleStop}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-danger text-white text-sm font-medium"
          >
            <Square size={15} />
            {t('tracer.stop')}
          </button>
        )}
      </div>

      {/* Статус-строка */}
      {(method || running) && (
        <div className="flex items-center gap-3 text-xs text-muted mb-4">
          {/* Пульсирующий индикатор мониторинга */}
          {running && (
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-ok animate-pulse" />
              <span className="text-ok">мониторинг</span>
            </span>
          )}
          {!running && hasResults && (
            <span className="flex items-center gap-1.5">
              <CheckCircle2 size={13} className="text-ok" />
              <span className="text-ok">завершено</span>
            </span>
          )}

          {resolvedIp && (
            <span className="font-mono">{resolvedIp}</span>
          )}

          {method && (
            <span className={method === 'raw' ? 'text-ok' : 'text-warn'}>
              {method === 'raw' ? t('tracer.methodRaw') : t('tracer.methodSystem')}
            </span>
          )}

          {lastUpdated && (
            <span className="ml-auto">
              обновлено {new Date(lastUpdated).toLocaleTimeString()}
            </span>
          )}
        </div>
      )}

      {/* Ошибка */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-danger/10 border border-danger/30 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Сводка по трассе (показывается когда есть результаты) */}
      {hasResults && (
        <div className="grid grid-cols-4 gap-3 mb-4">
          <SummaryCard
            label="Хопов"
            value={String(totalHops)}
          />
          <SummaryCard
            label="С потерями"
            value={String(hopsWithLoss)}
            highlight={hopsWithLoss > 0}
          />
          <SummaryCard
            label="Задержка (конечный)"
            value={lastHop?.lastMs != null ? `${lastHop.lastMs} мс` : '—'}
          />
          <SummaryCard
            label="Avg (конечный)"
            value={lastHop?.avg != null ? `${lastHop.avg} мс` : '—'}
          />
        </div>
      )}

      {/* Таблица хопов */}
      {hasResults && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-xs sticky top-0">
              <tr>
                <th className="px-3 py-2.5 font-medium text-muted w-8">#</th>
                <th className="px-3 py-2.5 font-medium text-muted">{t('tracer.host')}</th>
                <th className="px-3 py-2.5 font-medium text-muted text-right">{t('tracer.loss')}</th>
                <th className="px-3 py-2.5 font-medium text-muted w-20"></th>
                <th className="px-3 py-2.5 font-medium text-muted text-right">{t('tracer.last')}</th>
                <th className="px-3 py-2.5 font-medium text-muted text-right">avg</th>
                <th className="px-3 py-2.5 font-medium text-muted text-right">min</th>
                <th className="px-3 py-2.5 font-medium text-muted text-right">max</th>
                <th className="px-3 py-2.5 font-medium text-muted text-right">{t('tracer.jitter')}</th>
                <th className="px-3 py-2.5 font-medium text-muted text-right">recv/sent</th>
              </tr>
            </thead>
            <tbody className="group">
              {hops.map((h) => (
                <HopRow key={h.hop} hop={h} maxMs={maxMs} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Пустое состояние — до первого запуска */}
      {!hasResults && !running && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-center select-none">
          <Route size={40} className="text-muted/40 mb-4" strokeWidth={1.5} />
          <p className="text-sm text-muted mb-1">Введите хост или IP и нажмите «Трассировать»</p>
          <p className="text-xs text-muted/60">Например: google.com, 8.8.8.8, mover.uz</p>
        </div>
      )}

      {/* Состояние загрузки — ждём первых хопов */}
      {!hasResults && running && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex gap-1 mb-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full bg-accent animate-bounce"
                style={{ animationDelay: `${i * 120}ms` }}
              />
            ))}
          </div>
          <p className="text-sm text-muted">Построение маршрута…</p>
        </div>
      )}
    </div>
  )
}

// ── Компонент: карточка сводки ────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}): JSX.Element {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3">
      <div className="text-xs text-muted mb-1">{label}</div>
      <div className={`text-lg font-semibold font-mono ${highlight ? 'text-danger' : ''}`}>
        {value}
      </div>
    </div>
  )
}