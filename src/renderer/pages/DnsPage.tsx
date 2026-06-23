import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, Copy, Check, Loader2 } from 'lucide-react'
import {
  DNS_RECORD_TYPES,
  type DnsLookupResult,
  type DnsRecordType,
  type WhoisResult
} from '@shared/dns-types'

type TypeFilter = DnsRecordType | 'ALL'

export function DnsPage(): JSX.Element {
  const { t } = useTranslation()
  const [host, setHost] = useState('')
  const [type, setType] = useState<TypeFilter>('ALL')
  const [server, setServer] = useState('')
  const [result, setResult] = useState<DnsLookupResult | null>(null)
  const [whois, setWhois] = useState<WhoisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [whoisLoading, setWhoisLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runLookup = async (): Promise<void> => {
    if (!host.trim()) return
    setLoading(true)
    setError(null)
    setWhois(null)
    const res = await window.netpulse.dns.lookup({ host: host.trim(), type, server })
    setLoading(false)
    if (res.ok) setResult(res.data)
    else {
      setResult(null)
      setError(res.error.message)
    }
  }

  const runWhois = async (): Promise<void> => {
    if (!host.trim()) return
    setWhoisLoading(true)
    setError(null)
    const res = await window.netpulse.dns.whois({ query: host.trim() })
    setWhoisLoading(false)
    if (res.ok) setWhois(res.data)
    else setError(res.error.message)
  }

  const onKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter') void runLookup()
  }

  const filters: TypeFilter[] = ['ALL', ...DNS_RECORD_TYPES]

  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      <h2 className="text-xl font-semibold mb-6">{t('nav.dns')}</h2>

      <div className="flex gap-2 mb-3">
        <input
          value={host}
          onChange={(e) => setHost(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t('dns.hostPlaceholder')}
          className="flex-1 px-4 py-2.5 rounded-lg bg-surface border border-border text-sm font-mono outline-none focus:border-accent"
        />
        <button
          onClick={() => void runLookup()}
          disabled={loading || !host.trim()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-accent-fg text-sm disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          {t('dns.lookup')}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setType(f)}
            className={[
              'px-3 py-1 rounded-md text-xs border transition-colors',
              type === f
                ? 'bg-accent text-accent-fg border-accent'
                : 'bg-surface text-muted border-border hover:text-fg'
            ].join(' ')}
          >
            {f === 'ALL' ? t('dns.allTypes') : f}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-6">
        <span className="text-xs text-muted">{t('dns.server')}:</span>
        <input
          value={server}
          onChange={(e) => setServer(e.target.value)}
          placeholder={t('dns.serverPlaceholder')}
          className="w-48 px-3 py-1.5 rounded-md bg-surface border border-border text-xs font-mono outline-none focus:border-accent"
        />
        <button
          onClick={() => void runWhois()}
          disabled={whoisLoading || !host.trim()}
          className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface-2 border border-border text-xs hover:text-fg disabled:opacity-50"
        >
          {whoisLoading && <Loader2 size={14} className="animate-spin" />}
          WHOIS
        </button>
      </div>

      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      {result && (
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs text-muted mb-2">
            <span>
              {result.host} · {result.server}
            </span>
            <span>{result.elapsedMs} ms</span>
          </div>
          {result.records.length === 0 ? (
            <p className="text-sm text-muted py-4 text-center">{t('dns.noRecords')}</p>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <tbody>
                  {result.records.map((r, i) => (
                    <tr
                      key={i}
                      className="border-t border-border first:border-t-0 hover:bg-surface-2"
                    >
                      <td className="px-3 py-2 w-16 text-muted font-mono">{r.type}</td>
                      <td className="px-3 py-2 font-mono break-all">{r.value}</td>
                      <td className="px-3 py-2 w-10">
                        <CopyBtn value={r.value} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {whois && (
        <div>
          <div className="flex items-center justify-between text-xs text-muted mb-2">
            <span>WHOIS · {whois.query}</span>
            <span>{whois.elapsedMs} ms</span>
          </div>
          <div className="rounded-lg border border-border bg-surface p-3 max-h-96 overflow-y-auto">
            <pre className="text-xs font-mono whitespace-pre-wrap break-all text-fg">
              {whois.raw}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}

function CopyBtn({ value }: { value: string }): JSX.Element {
  const [copied, setCopied] = useState(false)
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      /* буфер недоступен */
    }
  }
  return (
    <button onClick={() => void copy()} className="text-muted hover:text-fg">
      {copied ? <Check size={14} className="text-ok" /> : <Copy size={14} />}
    </button>
  )
}
