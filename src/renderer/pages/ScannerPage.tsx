import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Play, Square, Radar, Download, FileJson } from 'lucide-react'
import { useScannerStore } from '@/store/scanner'
import { exportCsv, exportJson } from '@/lib/export'
import { ipv4ToInt } from '@shared/ipv4'
import {
  Button,
  Input,
  ProgressBar,
  StatusDot,
  EmptyState,
  PageContainer,
  PageHeader,
  TableShell,
  Table,
  THead,
  TH,
  TR,
  TD
} from '@/components/ui'

export function ScannerPage(): JSX.Element {
  const { t } = useTranslation()
  const { range, running, hosts, progress, setRange, init, start, cancel } = useScannerStore()

  useEffect(() => {
    void init()
  }, [init])

  // Сортируем живые хосты по числовому IP.
  const list = useMemo(() => {
    return Object.values(hosts)
      .filter((h) => h.alive)
      .sort((a, b) => ipv4ToInt(a.ip) - ipv4ToInt(b.ip))
  }, [hosts])

  const pct = progress && progress.total > 0 ? Math.round((progress.scanned / progress.total) * 100) : 0

  return (
    <PageContainer maxWidth="max-w-5xl">
      <PageHeader icon={Radar} title={t('nav.scanner')} />

      <div className="flex gap-2 mb-4">
        <Input
          value={range}
          onChange={(e) => setRange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !running && void start()}
          placeholder="192.168.1.0/24"
          disabled={running}
        />
        {!running ? (
          <Button variant="primary" onClick={() => void start()} disabled={!range.trim()}>
            <Play size={16} />
            {t('scanner.start')}
          </Button>
        ) : (
          <Button variant="danger" onClick={() => void cancel()}>
            <Square size={16} />
            {t('scanner.stop')}
          </Button>
        )}
      </div>

      {progress && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-muted mb-1">
            <span>
              {t('scanner.scanned')}: <span className="font-mono tabular-nums">{progress.scanned}/{progress.total}</span> ·{' '}
              {t('scanner.found')}: <span className="font-mono tabular-nums">{progress.found}</span> ·{' '}
              <span className={progress.method === 'raw' ? 'text-ok' : 'text-warn'}>
                {progress.method === 'raw' ? t('scanner.methodRaw') : t('scanner.methodSystem')}
              </span>
            </span>
            <span className="font-mono tabular-nums">{pct}%</span>
          </div>
          <ProgressBar fraction={pct / 100} />
        </div>
      )}

      {list.length > 0 && (
        <>
          <div className="flex gap-2 mb-3">
            <Button size="sm" variant="secondary" onClick={() => exportCsv(list)}>
              <Download size={14} /> CSV
            </Button>
            <Button size="sm" variant="secondary" onClick={() => exportJson(list)}>
              <FileJson size={14} /> JSON
            </Button>
          </div>

          <TableShell>
            <Table>
              <THead>
                <tr>
                  <TH>{t('scanner.ip')}</TH>
                  <TH>{t('scanner.hostname')}</TH>
                  <TH>{t('scanner.mac')}</TH>
                  <TH>{t('scanner.vendor')}</TH>
                  <TH className="text-right">ms</TH>
                </tr>
              </THead>
              <tbody className="font-mono tabular-nums">
                {list.map((h) => (
                  <TR key={h.ip}>
                    <TD>
                      <span className="inline-flex items-center gap-2">
                        <StatusDot tone="ok" />
                        {h.ip}
                      </span>
                    </TD>
                    <TD className="text-muted">{h.hostname ?? '—'}</TD>
                    <TD className="text-muted">{h.mac ?? '—'}</TD>
                    <TD className="text-muted">{h.vendor ?? '—'}</TD>
                    <TD className="text-right">{h.timeMs ?? ''}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </TableShell>
        </>
      )}

      {!running && progress?.done && list.length === 0 && (
        <EmptyState icon={Radar} title={t('scanner.nothingFound')} />
      )}
    </PageContainer>
  )
}
