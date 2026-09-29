import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Loader2 } from 'lucide-react'
import { parsePorts } from '@shared/ports'
import type { PortResult } from '@shared/pingport-types'
import { Button, Input, TableShell, Table, THead, TH, TR, TD } from '@/components/ui'

export function PortTab(): JSX.Element {
  const { t } = useTranslation()
  const [host, setHost] = useState('')
  const [portsStr, setPortsStr] = useState('22,80,443,3389')
  const [results, setResults] = useState<PortResult[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runCheck = async (): Promise<void> => {
    if (!host.trim()) return
    setError(null)
    setResults(null)
    try {
      const ports = parsePorts(portsStr)
      if (ports.length === 0) {
        setError(t('pingport.noPorts'))
        return
      }
      setLoading(true)
      const res = await window.netpulse.ping.checkPorts({ host: host.trim(), ports })
      setLoading(false)
      if (res.ok) setResults(res.data)
      else setError(res.error.message)
    } catch (e) {
      setLoading(false)
      setError((e as Error).message)
    }
  }

  return (
    <div>
      <Input
        value={host}
        onChange={(e) => setHost(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && void runCheck()}
        placeholder={t('pingport.hostPlaceholder')}
        className="mb-4"
      />

      <label className="block text-xs text-muted mb-1">{t('pingport.ports')}</label>
      <Input
        value={portsStr}
        onChange={(e) => setPortsStr(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && void runCheck()}
        placeholder="22,80,443,8000-8010"
        className="mb-1"
      />
      <p className="text-xs text-muted mb-4">{t('pingport.portsHint')}</p>

      <Button variant="primary" onClick={() => void runCheck()} disabled={loading || !host.trim()} className="mb-6">
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
        {t('pingport.check')}
      </Button>

      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      {results && results.length > 0 && (
        <TableShell>
          <Table>
            <THead>
              <tr>
                <TH>{t('pingport.port')}</TH>
                <TH>{t('pingport.status')}</TH>
                <TH>{t('pingport.service')}</TH>
                <TH className="text-right">ms</TH>
              </tr>
            </THead>
            <tbody className="font-mono">
              {results.map((p, i) => (
                <TR key={i}>
                  <TD className="tabular-nums">{p.port}</TD>
                  <TD>
                    <StatusLabel status={p.status} />
                  </TD>
                  <TD className="text-muted">{p.service ?? '—'}</TD>
                  <TD className="text-right tabular-nums">{p.timeMs ?? ''}</TD>
                </TR>
              ))}
            </tbody>
          </Table>
        </TableShell>
      )}
    </div>
  )
}

function StatusLabel({ status }: { status: PortResult['status'] }): JSX.Element {
  const map: Record<PortResult['status'], string> = {
    open: 'text-ok',
    closed: 'text-danger',
    filtered: 'text-warn'
  }
  const label: Record<PortResult['status'], string> = {
    open: 'open',
    closed: 'closed',
    filtered: 'filtered'
  }
  return <span className={map[status]}>{label[status]}</span>
}
