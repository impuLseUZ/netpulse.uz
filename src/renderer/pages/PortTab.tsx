import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Loader2 } from 'lucide-react'
import { parsePorts } from '@shared/ports'
import type { PortResult } from '@shared/pingport-types'

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
      <input
        value={host}
        onChange={(e) => setHost(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && void runCheck()}
        placeholder={t('pingport.hostPlaceholder')}
        className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border text-sm font-mono outline-none focus:border-accent mb-4"
      />

      <label className="block text-xs text-muted mb-1">{t('pingport.ports')}</label>
      <input
        value={portsStr}
        onChange={(e) => setPortsStr(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && void runCheck()}
        placeholder="22,80,443,8000-8010"
        className="w-full px-3 py-2 rounded-md bg-surface border border-border text-sm font-mono outline-none focus:border-accent mb-1"
      />
      <p className="text-xs text-muted mb-4">{t('pingport.portsHint')}</p>

      <button
        onClick={() => void runCheck()}
        disabled={loading || !host.trim()}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-fg text-sm disabled:opacity-50 mb-6"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
        {t('pingport.check')}
      </button>

      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      {results && results.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-left text-muted text-xs">
              <tr>
                <th className="px-3 py-2 font-medium">{t('pingport.port')}</th>
                <th className="px-3 py-2 font-medium">{t('pingport.status')}</th>
                <th className="px-3 py-2 font-medium">{t('pingport.service')}</th>
                <th className="px-3 py-2 font-medium text-right">ms</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {results.map((p, i) => (
                <tr key={i} className="border-t border-border hover:bg-surface-2">
                  <td className="px-3 py-1.5">{p.port}</td>
                  <td className="px-3 py-1.5"><StatusBadge status={p.status} /></td>
                  <td className="px-3 py-1.5 text-muted">{p.service ?? '—'}</td>
                  <td className="px-3 py-1.5 text-right">{p.timeMs ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: PortResult['status'] }): JSX.Element {
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
