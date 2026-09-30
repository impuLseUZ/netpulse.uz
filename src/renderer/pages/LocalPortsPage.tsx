import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCw, ServerCog, Search } from 'lucide-react'
import { useLocalPortsStore } from '@/store/localports'
import {
  Button,
  Input,
  Pill,
  PillGroup,
  Toggle,
  Badge,
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

type ProtoFilter = 'ALL' | 'TCP' | 'UDP'
const AUTO_REFRESH_MS = 3000

export function LocalPortsPage(): JSX.Element {
  const { t } = useTranslation()
  const { entries, loading, autoRefresh, lastUpdated, setAutoRefresh, refresh } = useLocalPortsStore()
  const [search, setSearch] = useState('')
  const [proto, setProto] = useState<ProtoFilter>('ALL')

  useEffect(() => { void refresh() }, [refresh])

  useEffect(() => {
    if (!autoRefresh) return
    const id = setInterval(() => void refresh(), AUTO_REFRESH_MS)
    return () => clearInterval(id)
  }, [autoRefresh, refresh])

  const list = useMemo(() => {
    const q = search.trim().toLowerCase()
    return entries
      .filter((e) => proto === 'ALL' || e.protocol === proto)
      .filter((e) => {
        if (!q) return true
        return (
          String(e.port).includes(q) ||
          e.processName?.toLowerCase().includes(q) ||
          String(e.pid ?? '').includes(q) ||
          e.localAddress.toLowerCase().includes(q)
        )
      })
  }, [entries, search, proto])

  return (
    <PageContainer maxWidth="max-w-4xl">
      <PageHeader
        icon={ServerCog}
        title={t('nav.localports')}
        meta={lastUpdated ? `${t('localports.updated')} ${new Date(lastUpdated).toLocaleTimeString()}` : undefined}
      />

      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('localports.searchPlaceholder')}
            className="pl-8"
          />
        </div>
        <Button variant="secondary" onClick={() => void refresh()} disabled={loading}>
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {t('localports.refresh')}
        </Button>
      </div>

      <div className="flex items-center justify-between mb-5">
        <PillGroup>
          {(['ALL', 'TCP', 'UDP'] as ProtoFilter[]).map((p) => (
            <Pill key={p} active={proto === p} onClick={() => setProto(p)}>
              {p === 'ALL' ? t('localports.allProtocols') : p}
            </Pill>
          ))}
        </PillGroup>
        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <Toggle checked={autoRefresh} onChange={setAutoRefresh} label={t('localports.autoRefresh')} />
          {t('localports.autoRefresh')}
        </label>
      </div>

      {list.length > 0 ? (
        <TableShell>
          <Table>
            <THead>
              <tr>
                <TH>{t('localports.colProtocol')}</TH>
                <TH>{t('localports.colAddress')}</TH>
                <TH>{t('localports.colPort')}</TH>
                <TH>{t('localports.colPid')}</TH>
                <TH>{t('localports.colProcess')}</TH>
                <TH className="w-10" />
              </tr>
            </THead>
            <tbody className="font-mono">
              {list.map((e, i) => (
                <TR key={`${e.protocol}-${e.localAddress}-${e.port}-${e.pid ?? i}`}>
                  <TD>
                    <Badge tone={e.protocol === 'TCP' ? 'accent' : 'neutral'}>{e.protocol}</Badge>
                  </TD>
                  <TD className="text-muted">{e.localAddress}</TD>
                  <TD className="text-fg tabular-nums">{e.port}</TD>
                  <TD className="text-muted tabular-nums">{e.pid ?? '—'}</TD>
                  <TD className="text-muted">{e.processName ?? '—'}</TD>
                  <TD>
                    <CopyButton value={String(e.port)} />
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </TableShell>
      ) : (
        !loading && <EmptyState icon={ServerCog} title={t('localports.nothingFound')} />
      )}
    </PageContainer>
  )
}
