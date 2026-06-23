import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Check } from 'lucide-react'
import { calculate, subnet, type SubnetCalc, type SubnetRow } from '@shared/ipcalc'

export function IpCalcPage(): JSX.Element {
  const { t } = useTranslation()
  const [input, setInput] = useState('192.168.1.0/24')
  const [subnetMode, setSubnetMode] = useState<'count' | 'hosts'>('count')
  const [subnetValue, setSubnetValue] = useState(4)

  // Расчёт реактивный: пересчитываем при изменении ввода, ошибки ловим.
  const result = useMemo((): { calc?: SubnetCalc; error?: string } => {
    try {
      return { calc: calculate(input) }
    } catch (e) {
      return { error: (e as Error).message }
    }
  }, [input])

  const subnets = useMemo((): { rows?: SubnetRow[]; error?: string } => {
    if (!result.calc) return {}
    try {
      return { rows: subnet(input, subnetMode, subnetValue) }
    } catch (e) {
      return { error: (e as Error).message }
    }
  }, [input, subnetMode, subnetValue, result.calc])

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <h2 className="text-xl font-semibold mb-6">{t('nav.ipcalc')}</h2>

      <label className="block text-sm text-muted mb-2">{t('ipcalc.inputLabel')}</label>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="192.168.1.0/24"
        className={[
          'w-full px-4 py-2.5 rounded-lg bg-surface border text-sm font-mono outline-none transition-colors',
          result.error ? 'border-danger' : 'border-border focus:border-accent'
        ].join(' ')}
      />
      {result.error && <p className="text-danger text-sm mt-2">{result.error}</p>}

      {result.calc && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6">
            <ResultRow label={t('ipcalc.network')} value={result.calc.network} />
            <ResultRow label={t('ipcalc.broadcast')} value={result.calc.broadcast} />
            <ResultRow
              label={t('ipcalc.hostRange')}
              value={`${result.calc.firstHost} – ${result.calc.lastHost}`}
            />
            <ResultRow
              label={t('ipcalc.usableHosts')}
              value={result.calc.usableHosts.toLocaleString()}
            />
            <ResultRow label={t('ipcalc.netmask')} value={result.calc.netmask} />
            <ResultRow label={t('ipcalc.wildcard')} value={result.calc.wildcard} />
            <ResultRow label={t('ipcalc.cidr')} value={`/${result.calc.prefix}`} />
            <ResultRow
              label={t('ipcalc.totalAddresses')}
              value={result.calc.totalAddresses.toLocaleString()}
            />
            <ResultRow label={t('ipcalc.netClass')} value={result.calc.netClass} />
            <ResultRow
              label={t('ipcalc.scope')}
              value={result.calc.isPrivate ? t('ipcalc.private') : t('ipcalc.public')}
            />
          </div>

          <div className="grid grid-cols-1 gap-2 mt-2">
            <ResultRow label={t('ipcalc.binAddress')} value={result.calc.binaryAddress} mono />
            <ResultRow label={t('ipcalc.binMask')} value={result.calc.binaryMask} mono />
          </div>

          {/* ── Subnetting ── */}
          <div className="mt-8">
            <h3 className="text-sm font-semibold mb-3">{t('ipcalc.subnetting')}</h3>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <button
                onClick={() => setSubnetMode('count')}
                className={pillCls(subnetMode === 'count')}
              >
                {t('ipcalc.byCount')}
              </button>
              <button
                onClick={() => setSubnetMode('hosts')}
                className={pillCls(subnetMode === 'hosts')}
              >
                {t('ipcalc.byHosts')}
              </button>
              <input
                type="number"
                min={1}
                value={subnetValue}
                onChange={(e) => setSubnetValue(Math.max(1, Number(e.target.value) || 1))}
                className="w-28 px-3 py-1.5 rounded-md bg-surface border border-border text-sm outline-none focus:border-accent"
              />
            </div>

            {subnets.error && <p className="text-danger text-sm">{subnets.error}</p>}

            {subnets.rows && subnets.rows.length > 0 && (
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-surface-2 sticky top-0">
                      <tr className="text-left text-muted">
                        <th className="px-3 py-2 font-medium">#</th>
                        <th className="px-3 py-2 font-medium">{t('ipcalc.network')}</th>
                        <th className="px-3 py-2 font-medium">{t('ipcalc.hostRange')}</th>
                        <th className="px-3 py-2 font-medium">{t('ipcalc.broadcast')}</th>
                        <th className="px-3 py-2 font-medium text-right">
                          {t('ipcalc.hosts')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {subnets.rows.map((r) => (
                        <tr key={r.index} className="border-t border-border hover:bg-surface-2">
                          <td className="px-3 py-1.5 text-muted">{r.index}</td>
                          <td className="px-3 py-1.5">
                            {r.network}/{r.prefix}
                          </td>
                          <td className="px-3 py-1.5">
                            {r.firstHost} – {r.lastHost}
                          </td>
                          <td className="px-3 py-1.5">{r.broadcast}</td>
                          <td className="px-3 py-1.5 text-right">{r.usableHosts}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function pillCls(active: boolean): string {
  return [
    'px-3 py-1.5 rounded-md text-sm border transition-colors',
    active
      ? 'bg-accent text-accent-fg border-accent'
      : 'bg-surface text-muted border-border hover:text-fg'
  ].join(' ')
}

function ResultRow({
  label,
  value,
  mono
}: {
  label: string
  value: string
  mono?: boolean
}): JSX.Element {
  const [copied, setCopied] = useState(false)
  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      /* буфер недоступен — тихо игнорируем */
    }
  }
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-md bg-surface border border-border">
      <span className="text-xs text-muted shrink-0">{label}</span>
      <span className={['text-sm truncate', mono ? 'font-mono text-xs' : ''].join(' ')}>
        {value}
      </span>
      <button onClick={() => void copy()} className="text-muted hover:text-fg shrink-0">
        {copied ? <Check size={14} className="text-ok" /> : <Copy size={14} />}
      </button>
    </div>
  )
}
