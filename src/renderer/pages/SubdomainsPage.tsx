import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Play, Square, ListTree, Download, FileJson } from 'lucide-react'
import { useSubdomainsStore } from '@/store/subdomains'
import {
  Button,
  Input,
  ProgressBar,
  Badge,
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

export function SubdomainsPage(): JSX.Element {
  const { t } = useTranslation()
  const {
    domain, extraWords, useCrtSh, useBruteforce, running, hosts, progress, crtShError,
    setDomain, setExtraWords, setUseCrtSh, setUseBruteforce, subscribe, start, cancel
  } = useSubdomainsStore()

  useEffect(() => { subscribe() }, [subscribe])

  const list = useMemo(
    () => Object.values(hosts).sort((a, b) => a.subdomain.localeCompare(b.subdomain)),
    [hosts]
  )

  const pct = progress && progress.total > 0 ? Math.round((progress.scanned / progress.total) * 100) : 0
  const canStart = domain.trim().length > 0 && (useCrtSh || useBruteforce) && !running

  const exportJson = (): void => {
    download(`netpulse-subdomains-${domain}.json`, JSON.stringify(list, null, 2), 'application/json')
  }
  const exportCsv = (): void => {
    const escape = (v: string): string => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)
    const header = ['Subdomain', 'IPs', 'Source']
    const rows = list.map((h) => [h.subdomain, h.ips.join(' '), h.source].map((c) => escape(c)).join(','))
    download(`netpulse-subdomains-${domain}.csv`, [header.join(','), ...rows].join('\n'), 'text/csv')
  }

  return (
    <PageContainer maxWidth="max-w-5xl">
      <PageHeader icon={ListTree} title={t('nav.subdomains')} />

      <div className="flex gap-2 mb-4">
        <Input
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && canStart && void start()}
          placeholder={t('subdomains.domainPlaceholder')}
          disabled={running}
        />
        {!running ? (
          <Button variant="primary" onClick={() => void start()} disabled={!canStart}>
            <Play size={16} />
            {t('subdomains.start')}
          </Button>
        ) : (
          <Button variant="danger" onClick={() => void cancel()}>
            <Square size={16} />
            {t('subdomains.stop')}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-6 mb-4">
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Toggle checked={useCrtSh} onChange={setUseCrtSh} label={t('subdomains.sourceCrtSh')} />
          {t('subdomains.sourceCrtSh')}
        </label>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Toggle checked={useBruteforce} onChange={setUseBruteforce} label={t('subdomains.sourceBruteforce')} />
          {t('subdomains.sourceBruteforce')}
        </label>
      </div>

      <div className="mb-5">
        <Input
          value={extraWords}
          onChange={(e) => setExtraWords(e.target.value)}
          placeholder={t('subdomains.extraWordsPlaceholder')}
          disabled={running}
          className="text-xs"
        />
        <p className="text-[11px] text-muted mt-1">{t('subdomains.extraWordsHint')}</p>
      </div>

      {crtShError && (
        <Banner tone="warn" title={t('subdomains.crtShErrorTitle')} className="mb-4">
          {crtShError}
        </Banner>
      )}

      {progress && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-muted mb-1">
            <span>
              {progress.phase === 'crtsh' && t('subdomains.phaseCrtSh')}
              {progress.phase === 'dns' && t('subdomains.phaseDns')}
              {progress.phase === 'done' && t('subdomains.phaseDone')}
              {' · '}
              {t('subdomains.found')}: <span className="font-mono tabular-nums">{progress.found}</span>
            </span>
            {progress.total > 0 && <span className="font-mono tabular-nums">{pct}%</span>}
          </div>
          <ProgressBar fraction={progress.total > 0 ? pct / 100 : progress.done ? 1 : 0} />
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
                  <TH>{t('subdomains.colSubdomain')}</TH>
                  <TH>{t('subdomains.colIps')}</TH>
                  <TH>{t('subdomains.colSource')}</TH>
                  <TH className="w-10" />
                </tr>
              </THead>
              <tbody className="font-mono">
                {list.map((h) => (
                  <TR key={h.subdomain}>
                    <TD>{h.subdomain}</TD>
                    <TD className="text-muted tabular-nums">{h.ips.length > 0 ? h.ips.join(', ') : '—'}</TD>
                    <TD>
                      <Badge tone={h.source === 'crtsh' ? 'accent' : 'neutral'}>
                        {h.source === 'crtsh' ? t('subdomains.sourceCrtShShort') : t('subdomains.sourceBruteforceShort')}
                      </Badge>
                    </TD>
                    <TD>
                      <CopyButton value={h.subdomain} />
                    </TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </TableShell>
        </>
      )}

      {!running && progress?.done && list.length === 0 && (
        <EmptyState icon={ListTree} title={t('subdomains.nothingFound')} />
      )}
    </PageContainer>
  )
}
