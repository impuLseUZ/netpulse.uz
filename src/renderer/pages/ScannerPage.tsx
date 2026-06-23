import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Play, Square, Radar, Download, FileJson } from 'lucide-react'
import { useScannerStore } from '@/store/scanner'
import { exportCsv, exportJson } from '@/lib/export'
import { ipv4ToInt } from '@shared/ipv4'

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

  const pct = progress && progress.total > 0
    ? Math.round((progress.scanned / progress.total) * 100)
    : 0

  return (
    <div className="p-8 max-w-5xl mx-auto w-full">
      <h2 className="text-xl font-semibold mb-6">{t('nav.scanner')}</h2>

      <div className="flex gap-2 mb-4">
        <input
          value={range}
          onChange={(e) => setRange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !running && void start()}
          placeholder="192.168.1.0/24"
          disabled={running}
          className="flex-1 px-4 py-2.5 rounded-lg bg-surface border border-border text-sm font-mono outline-none focus:border-accent disabled:opacity-60"
        />
        {!running ? (
          <button
            onClick={() => void start()}
            disabled={!range.trim()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-accent-fg text-sm disabled:opacity-50"
          >
            <Play size={16} />
            {t('scanner.start')}
          </button>
        ) : (
          <button
            onClick={() => void cancel()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-danger text-white text-sm"
          >
            <Square size={16} />
            {t('scanner.stop')}
          </button>
        )}
      </div>

      {progress && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs text-muted mb-1">
            <span>
              {t('scanner.scanned')}: {progress.scanned}/{progress.total} ·{' '}
              {t('scanner.found')}: {progress.found} ·{' '}
              <span className={progress.method === 'raw' ? 'text-ok' : 'text-warn'}>
                {progress.method === 'raw' ? t('scanner.methodRaw') : t('scanner.methodSystem')}
              </span>
            </span>
            <span>{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {list.length > 0 && (
        <>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => exportCsv(list)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface border border-border text-xs hover:text-fg"
            >
              <Download size={14} /> CSV
            </button>
            <button
              onClick={() => exportJson(list)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface border border-border text-xs hover:text-fg"
            >
              <FileJson size={14} /> JSON
            </button>
          </div>

          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-left text-muted text-xs">
                <tr>
                  <th className="px-3 py-2 font-medium">{t('scanner.ip')}</th>
                  <th className="px-3 py-2 font-medium">{t('scanner.hostname')}</th>
                  <th className="px-3 py-2 font-medium">{t('scanner.mac')}</th>
                  <th className="px-3 py-2 font-medium">{t('scanner.vendor')}</th>
                  <th className="px-3 py-2 font-medium text-right">ms</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {list.map((h) => (
                  <tr key={h.ip} className="border-t border-border hover:bg-surface-2">
                    <td className="px-3 py-1.5">
                      <span className="inline-flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full bg-ok" />
                        {h.ip}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-muted">{h.hostname ?? '—'}</td>
                    <td className="px-3 py-1.5 text-muted">{h.mac ?? '—'}</td>
                    <td className="px-3 py-1.5 text-muted">{h.vendor ?? '—'}</td>
                    <td className="px-3 py-1.5 text-right">{h.timeMs ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!running && progress?.done && list.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Radar size={36} className="text-muted mb-3" />
          <p className="text-sm text-muted">{t('scanner.nothingFound')}</p>
        </div>
      )}
    </div>
  )
}
