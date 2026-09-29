import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Play, Square, Trash2, Download, Gauge, Wifi } from 'lucide-react'
import { useSpeedtestStore } from '@/store/speedtest'
import { FirewallWarning } from '@/components/speedtest/FirewallWarning'
import { Button, Card, PageContainer, PageHeader, MetricRow, MetricSecondary, TableShell, Table, THead, TH, TR, TD, Badge } from '@/components/ui'
import type { SpeedtestHistoryEntry, SpeedtestPhase } from '@shared/speedtest-types'

/** Верхняя граница спидометра (Мбит/с). */
const GAUGE_MAX = 1000

/** Логарифмическая шкала: значения 1..1000 распределяются равномернее. */
function gaugeFraction(mbps: number): number {
  if (mbps <= 0) return 0
  const f = Math.log10(mbps + 1) / Math.log10(GAUGE_MAX + 1)
  return Math.max(0, Math.min(1, f))
}

function fmt(n: number | undefined, digits = 1): string {
  return n == null ? '—' : n.toFixed(digits)
}

/**
 * Полукруговой спидометр на SVG.
 * Дуга через stroke-dasharray/offset — браузер анимирует плавно сам.
 */
function Speedometer({
  value,
  phase,
}: {
  value: number | undefined
  phase: SpeedtestPhase
}): JSX.Element {
  const r      = 120
  const cx     = 160
  const cy     = 160
  const stroke = 18
  const frac   = value != null ? gaugeFraction(value) : 0
  const arcLen = Math.PI * r
  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`

  const active     = phase === 'download' || phase === 'upload'
  const valueColor = active ? 'rgb(var(--accent))' : 'rgb(var(--ok))'

  return (
    <svg viewBox="0 0 320 200" className="w-full max-w-sm">
      {/* Трек (фон дуги) */}
      <path
        d={arcPath}
        fill="none"
        stroke="rgb(var(--surface-2))"
        strokeWidth={stroke}
        strokeLinecap="round"
      />
      {/* Заполнение через dashoffset */}
      <path
        d={arcPath}
        fill="none"
        stroke={valueColor}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={arcLen}
        strokeDashoffset={arcLen * (1 - frac)}
        style={{ transition: 'stroke-dashoffset 0.45s ease-out, stroke 0.3s' }}
      />
      <text
        x={cx}
        y={cy - 14}
        textAnchor="middle"
        style={{ fontSize: 40, fontWeight: 700, fill: 'rgb(var(--accent))' }}
      >
        {fmt(value)}
      </text>
      <text
        x={cx}
        y={cy + 12}
        textAnchor="middle"
        style={{ fontSize: 14, fill: 'rgb(var(--muted))' }}
      >
        Mbps
      </text>
    </svg>
  )
}

/** Экспорт истории в CSV. */
function exportHistoryCsv(rows: SpeedtestHistoryEntry[]): void {
  const header = ['time', 'download_mbps', 'upload_mbps', 'ping_ms', 'jitter_ms', 'ip', 'isp', 'method']
  const lines = rows.map((r) =>
    [
      new Date(r.timestamp).toISOString(),
      r.downloadMbps?.toFixed(2) ?? '',
      r.uploadMbps?.toFixed(2)   ?? '',
      r.pingMs?.toFixed(1)        ?? '',
      r.jitterMs?.toFixed(1)      ?? '',
      r.ip  ?? '',
      (r.isp ?? '').replace(/[;,]/g, ' '),
      r.isFallback ? 'http-fallback' : 'cloudflare',
    ].join(',')
  )
  const csv  = [header.join(','), ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
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
    preflight,
    usedFallback,
    loadNetworkInfo,
    start,
    stop,
    clearHistory,
  } = useSpeedtestStore()

  useEffect(() => {
    void loadNetworkInfo()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Останавливаем замер при уходе со страницы
  useEffect(() => {
    return () => {
      const st = useSpeedtestStore.getState()
      if (st.running) {
        console.info('[speedtest] page unmount → stop')
        st.stop()
      }
    }
  }, [])

  // Во время upload — показываем upload на спидометре, иначе download
  const gaugeValue = useMemo(() => {
    if (phase === 'upload') return current.uploadMbps
    return current.downloadMbps
  }, [phase, current.downloadMbps, current.uploadMbps])

  const phaseLabel = (() => {
    if (phase === 'preflight') return t('speedtest.phase.preflight')
    if (running) return t(`speedtest.phase.${phase}`, { defaultValue: '' })
    if (phase === 'done')  return t('speedtest.phase.done')
    if (phase === 'error') return t('speedtest.phase.error')
    return ''
  })()

  /** Текст ошибки — переводим специальные коды, иначе показываем как есть. */
  const errorText = (() => {
    if (!error) return ''
    if (error === 'no_internet') return t('speedtest.firewall.no_internet.body')
    if (error === 'ssl_error')   return t('speedtest.firewall.ssl_error.body')
    return error
  })()

  return (
    <PageContainer>
      <PageHeader
        icon={Gauge}
        title={t('nav.speedtest')}
        meta={
          <span className="flex items-center gap-1.5">
            <Wifi size={13} />
            {netInfoLoading ? (
              t('speedtest.detecting')
            ) : netInfo?.ip ? (
              <span className="font-mono">
                {netInfo.ip}
                {netInfo.isp && <span> · {netInfo.isp}</span>}
                {netInfo.country && <span> · {netInfo.country}</span>}
              </span>
            ) : (
              t('speedtest.noNetInfo')
            )}
          </span>
        }
      />

      {/* Предупреждение о фаерволе (показывается после preflight) */}
      {preflight && (preflight.hint !== 'ok' || usedFallback) && (
        <FirewallWarning hint={preflight.hint} usedFallback={usedFallback} />
      )}

      {/* Спидометр + кнопка */}
      <Card className="p-6 flex flex-col items-center mb-4">
        <Speedometer value={gaugeValue} phase={phase} />

        {/* Статус-строка */}
        <div className="h-5 text-xs text-muted mt-1 mb-4 flex items-center gap-2">
          {phase === 'preflight' && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          )}
          {phaseLabel}
          {usedFallback && phase !== 'preflight' && (
            <span className="text-yellow-500 opacity-70">
              · {t('speedtest.firewall.method_fallback')}
            </span>
          )}
        </div>

        {!running ? (
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              console.info('[speedtest] start button clicked')
              start()
            }}
            className="px-6"
          >
            <Play size={16} />
            {phase === 'done' || phase === 'error' ? t('speedtest.restart') : t('speedtest.start')}
          </Button>
        ) : (
          <Button variant="danger" size="md" onClick={stop} className="px-6">
            <Square size={16} />
            {t('speedtest.stop')}
          </Button>
        )}

        {phase === 'error' && errorText && (
          <p className="text-xs text-danger mt-3 text-center max-w-md">{errorText}</p>
        )}
      </Card>

      {/* Метрики */}
      <MetricRow>
        <MetricSecondary label={t('speedtest.download')} value={fmt(current.downloadMbps)} unit="Mbps" active={phase === 'download'} />
        <MetricSecondary label={t('speedtest.upload')} value={fmt(current.uploadMbps)} unit="Mbps" active={phase === 'upload'} />
        <MetricSecondary label={t('speedtest.ping')} value={fmt(current.pingMs)} unit="ms" />
        <MetricSecondary label={t('speedtest.jitter')} value={fmt(current.jitterMs)} unit="ms" />
      </MetricRow>

      {/* История сессии */}
      {history.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">{t('speedtest.history')}</h3>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => exportHistoryCsv(history)}>
                <Download size={14} /> CSV
              </Button>
              <Button size="sm" variant="secondary" onClick={clearHistory}>
                <Trash2 size={14} /> {t('speedtest.clear')}
              </Button>
            </div>
          </div>

          <TableShell>
            <Table>
              <THead>
                <tr>
                  <TH>{t('speedtest.time')}</TH>
                  <TH className="text-right">↓ Mbps</TH>
                  <TH className="text-right">↑ Mbps</TH>
                  <TH className="text-right">{t('speedtest.ping')}</TH>
                  <TH className="text-right">{t('speedtest.jitter')}</TH>
                  <TH>{t('speedtest.method')}</TH>
                </tr>
              </THead>
              <tbody>
                {history.map((h) => (
                  <TR key={h.id}>
                    <TD className="text-muted">{new Date(h.timestamp).toLocaleTimeString()}</TD>
                    <TD className="text-right font-mono tabular-nums">{fmt(h.downloadMbps)}</TD>
                    <TD className="text-right font-mono tabular-nums">{fmt(h.uploadMbps)}</TD>
                    <TD className="text-right font-mono tabular-nums">{fmt(h.pingMs)}</TD>
                    <TD className="text-right font-mono tabular-nums">{fmt(h.jitterMs)}</TD>
                    <TD>
                      {h.isFallback ? (
                        <Badge tone="warn">{t('speedtest.firewall.method_fallback')}</Badge>
                      ) : (
                        <Badge tone="neutral">Cloudflare</Badge>
                      )}
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </TableShell>
        </div>
      )}
    </PageContainer>
  )
}