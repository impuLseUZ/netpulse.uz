import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Calculator } from 'lucide-react'
import { calculate, subnet, type SubnetCalc, type SubnetRow } from '@shared/ipcalc'
import { Input, Pill, CopyButton, PageContainer, PageHeader, TableShell, Table, THead, TH, TR, TD } from '@/components/ui'

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
    <PageContainer>
      <PageHeader icon={Calculator} title={t('nav.ipcalc')} />

      <label className="block text-sm text-muted mb-2">{t('ipcalc.inputLabel')}</label>
      <Input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="192.168.1.0/24"
        className={result.error ? 'border-danger' : undefined}
      />
      {result.error && <p className="text-danger text-sm mt-2">{result.error}</p>}

      {result.calc && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-6">
            <ResultRow label={t('ipcalc.network')} value={result.calc.network} />
            <ResultRow label={t('ipcalc.broadcast')} value={result.calc.broadcast} />
            <ResultRow label={t('ipcalc.hostRange')} value={`${result.calc.firstHost} – ${result.calc.lastHost}`} />
            <ResultRow label={t('ipcalc.usableHosts')} value={result.calc.usableHosts.toLocaleString()} />
            <ResultRow label={t('ipcalc.netmask')} value={result.calc.netmask} />
            <ResultRow label={t('ipcalc.wildcard')} value={result.calc.wildcard} />
            <ResultRow label={t('ipcalc.cidr')} value={`/${result.calc.prefix}`} />
            <ResultRow label={t('ipcalc.totalAddresses')} value={result.calc.totalAddresses.toLocaleString()} />
            <ResultRow label={t('ipcalc.netClass')} value={result.calc.netClass} />
            <ResultRow label={t('ipcalc.scope')} value={result.calc.isPrivate ? t('ipcalc.private') : t('ipcalc.public')} />
          </div>

          <div className="grid grid-cols-1 gap-2 mt-2">
            <ResultRow label={t('ipcalc.binAddress')} value={result.calc.binaryAddress} mono />
            <ResultRow label={t('ipcalc.binMask')} value={result.calc.binaryMask} mono />
          </div>

          {/* ── Subnetting ── */}
          <div className="mt-8">
            <h3 className="text-sm font-semibold mb-3">{t('ipcalc.subnetting')}</h3>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Pill active={subnetMode === 'count'} onClick={() => setSubnetMode('count')} size="md">
                {t('ipcalc.byCount')}
              </Pill>
              <Pill active={subnetMode === 'hosts'} onClick={() => setSubnetMode('hosts')} size="md">
                {t('ipcalc.byHosts')}
              </Pill>
              <Input
                type="number"
                min={1}
                value={subnetValue}
                onChange={(e) => setSubnetValue(Math.max(1, Number(e.target.value) || 1))}
                className="w-28 h-9"
              />
            </div>

            {subnets.error && <p className="text-danger text-sm">{subnets.error}</p>}

            {subnets.rows && subnets.rows.length > 0 && (
              <TableShell>
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <THead>
                      <tr className="sticky top-0 bg-surface-2">
                        <TH>#</TH>
                        <TH>{t('ipcalc.network')}</TH>
                        <TH>{t('ipcalc.hostRange')}</TH>
                        <TH>{t('ipcalc.broadcast')}</TH>
                        <TH className="text-right">{t('ipcalc.hosts')}</TH>
                      </tr>
                    </THead>
                    <tbody className="font-mono tabular-nums">
                      {subnets.rows.map((r) => (
                        <TR key={r.index}>
                          <TD className="text-muted">{r.index}</TD>
                          <TD>
                            {r.network}/{r.prefix}
                          </TD>
                          <TD>
                            {r.firstHost} – {r.lastHost}
                          </TD>
                          <TD>{r.broadcast}</TD>
                          <TD className="text-right">{r.usableHosts}</TD>
                        </TR>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </TableShell>
            )}
          </div>
        </>
      )}
    </PageContainer>
  )
}

function ResultRow({ label, value, mono }: { label: string; value: string; mono?: boolean }): JSX.Element {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2 rounded-control bg-surface border border-border">
      <span className="text-xs text-muted shrink-0">{label}</span>
      <span className={['text-sm truncate', mono ? 'font-mono text-xs' : ''].join(' ')}>{value}</span>
      <CopyButton value={value} className="shrink-0" />
    </div>
  )
}
