import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Play, Square, ScanSearch, Download, FileJson } from 'lucide-react'
import { usePortScannerStore } from '@/store/portscanner'
import type { PortScanPreset } from '@shared/portscan-presets'
import {
  Button,
  Input,
  Pill,
  PillGroup,
  ProgressBar,
  Toggle,
  Banner,
  CopyButton,
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

function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const PRESETS: PortScanPreset[] = ['top', 'wellKnown', 'full', 'custom']

export function PortScannerPage(): JSX.Element {
  const { t } = useTranslation()
  const {
    host, preset, customRange, grabBanner, running, hosts, progress,
    setHost, setPreset, setCustomRange, setGrabBanner, start, cancel
  } = usePortScannerStore()

  const list = useMemo(
    () => Object.values(hosts).sort((a, b) => a.port - b.port),
    [hosts]
  )

  const pct = progress && progress.total > 0 ? Math.round((progress.scanned / progress.total) * 100) : 0
  const canStart = host.trim().length > 0 && (preset !== 'custom' || customRange.trim().length > 0) && !running

  const exportJson = (): void => {
    download(`netpulse-portscan-${host}.json`, JSON.stringify(list, null, 2), 'application/json')
  }
  const exportCsv = (): void => {
    const escape = (v: string): string => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
    const header = ['Port', 'Status', 'Service', 'ms', 'Banner']
    const rows = list.map((h) =>
      [String(h.port), h.status, h.service ?? '', h.timeMs?.toString() ?? '', h.banner ?? '']
        .map((c) => escape(c))
        .join(',')
    )
    download(`netpulse-portscan-${host}.csv`, [header.join(','), ...rows].join('\n'), 'text/csv')
  }

  return (
    <PageContainer maxWidth="max-w-5xl">
      <PageHeader icon={ScanSearch} title={t('nav.portscan')} />

      <div className="flex gap-2 mb-3">
        <Input
          value={host}
          onChange={(e) => setHost(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && canStart && void start()}
          placeholder={t('portscan.hostPlaceholder')}
          disabled={running}
        />
        {!running ? (
          <Button variant="primary" onClick={() => void start()} disabled={!canStart}>
            <Play size={16} />
            {t('portscan.start')}
          </Button>
        ) : (
          <Button variant="danger" onClick={() => void cancel()}>
            <Square size={16} />
            {t('portscan.stop')}
          </Button>
        )}
      </div>

      <PillGroup>
        {PRESETS.map((p) => (
          <Pill key={p} active={preset === p} onClick={() => !running && setPreset(p)}>
            {t(`portscan.preset.${p}`)}
          </Pill>
        ))}
      </PillGroup>

      {preset === 'custom' && (
        <Input
          value={customRange}
          onChange={(e) => setCustomRange(e.target.value)}
          placeholder="22,80,443,8000-8010"
          disabled={running}
          className="mt-2 text-xs"
        />
      )}

      {preset === 'full' && (
        <Banner tone="warn" className="mt-3">
          {t('portscan.fullWarning')}
        </Banner>
      )}

      <label className="flex items-center gap-2 text-sm cursor-pointer mt-4 mb-5">
        <Toggle checked={grabBanner} onChange={setGrabBanner} label={t('portscan.grabBanner')} />
        {t('portscan.grabBanner')}
      </label>

      {progress && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-muted mb-1">
            <span>
              {t('portscan.scanned')}: <span className="font-mono tabular-nums">{progress.scanned}/{progress.total}</span> ·{' '}
              {t('portscan.open')}: <span className="font-mono tabular-nums text-ok">{progress.openCount}</span>
            </span>
            <span className="font-mono tabular-nums">{pct}%</span>
          </div>
          <ProgressBar fraction={pct / 100} tone="ok" />
        </div>
      )}

      {list.length > 0 && (
        <>
          <div className="flex gap-2 mb-3">
            <Button size="sm" variant="secondary" onClick={exportCsv}>
              <Download size={14} /> CSV
            </Button>
            <Button size="sm" variant="secondary" onClick={exportJson}>
              <FileJson size={14} /> JSON
            </Button>
          </div>

          <TableShell>
            <Table>
              <THead>
                <tr>
                  <TH>{t('portscan.colPort')}</TH>
                  <TH>{t('portscan.colService')}</TH>
                  <TH className="text-right">ms</TH>
                  <TH>{t('portscan.colBanner')}</TH>
                  <TH className="w-10" />
                </tr>
              </THead>
              <tbody className="font-mono">
                {list.map((h) => (
                  <TR key={h.port}>
                    <TD className="text-ok tabular-nums">{h.port}</TD>
                    <TD className="text-muted">{h.service ?? '—'}</TD>
                    <TD className="text-right tabular-nums">{h.timeMs ?? ''}</TD>
                    <TD className="text-muted text-xs break-all">{h.banner ?? '—'}</TD>
                    <TD>
                      <CopyButton value={String(h.port)} />
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </TableShell>
        </>
      )}

      {!running && progress?.done && list.length === 0 && (
        <EmptyState icon={ScanSearch} title={t('portscan.nothingFound')} />
      )}
    </PageContainer>
  )
}
