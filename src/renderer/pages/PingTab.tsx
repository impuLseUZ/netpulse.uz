import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Play, Square, Activity, Loader2 } from 'lucide-react'
import type { ContinuousTick, PingResult } from '@shared/pingport-types'

interface LogLine {
  seq: number
  timestamp: number
  alive: boolean
  timeMs?: number
}

export function PingTab(): JSX.Element {
  const { t } = useTranslation()
  const [host, setHost] = useState('')
  const [ping, setPing] = useState<PingResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [running, setRunning] = useState(false)
  const [log, setLog] = useState<LogLine[]>([])
  const sessionRef = useRef<string | null>(null)
  const logEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const off = window.netpulse.ping.onTick((tick: ContinuousTick) => {
      if (tick.sessionId !== sessionRef.current) return
      setLog((prev) => {
        const next = [...prev, { seq: tick.seq, timestamp: tick.timestamp, alive: tick.alive, timeMs: tick.timeMs }]
        return next.length > 500 ? next.slice(-500) : next
      })
    })
    return off
  }, [])

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log])

  const runOnce = async (): Promise<void> => {
    if (!host.trim()) return
    setError(null)
    setLoading(true)
    setPing(null)
    const res = await window.netpulse.ping.once(host.trim())
    setLoading(false)
    if (res.ok) setPing(res.data)
    else setError(res.error.message)
  }

  const toggleContinuous = async (): Promise<void> => {
    if (running) {
      if (sessionRef.current) await window.netpulse.ping.stopContinuous(sessionRef.current)
      sessionRef.current = null
      setRunning(false)
      return
    }
    if (!host.trim()) return
    const id = `sess-${Date.now()}`
    sessionRef.current = id
    setLog([])
    setRunning(true)
    await window.netpulse.ping.startContinuous({ host: host.trim(), sessionId: id, intervalMs: 1000 })
  }

  const stats = (() => {
    if (log.length === 0) return null
    const times = log.filter((l) => l.alive && l.timeMs !== undefined).map((l) => l.timeMs as number)
    const lost = log.filter((l) => !l.alive).length
    return {
      sent: log.length,
      lost,
      lossPct: Math.round((lost / log.length) * 100),
      min: times.length ? Math.min(...times) : undefined,
      avg: times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : undefined,
      max: times.length ? Math.max(...times) : undefined
    }
  })()

  return (
    <div>
      <input
        value={host}
        onChange={(e) => setHost(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && void runOnce()}
        placeholder={t('pingport.hostPlaceholder')}
        className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border text-sm font-mono outline-none focus:border-accent mb-4"
      />

      <div className="flex gap-2 mb-6">
        <button
          onClick={() => void runOnce()}
          disabled={loading || !host.trim() || running}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-accent-fg text-sm disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Activity size={16} />}
          {t('pingport.pingOnce')}
        </button>
        <button
          onClick={() => void toggleContinuous()}
          disabled={!host.trim()}
          className={[
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm border disabled:opacity-50',
            running ? 'bg-danger text-white border-danger' : 'bg-surface border-border hover:text-fg'
          ].join(' ')}
        >
          {running ? <Square size={16} /> : <Play size={16} />}
          {running ? t('pingport.stop') : t('pingport.continuous')}
        </button>
      </div>

      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      {ping && !running && (
        <div className="mb-6 p-3 rounded-lg bg-surface border border-border">
          <div className="flex items-center gap-2">
            <span className={['inline-block w-2.5 h-2.5 rounded-full', ping.alive ? 'bg-ok' : 'bg-danger'].join(' ')} />
            <span className="text-sm font-medium">
              {ping.host} — {ping.alive ? t('pingport.online') : t('pingport.offline')}
            </span>
            {ping.timeMs !== undefined && (
              <span className="text-sm text-muted font-mono ml-auto">{ping.timeMs} ms</span>
            )}
          </div>
        </div>
      )}

      {(running || log.length > 0) && (
        <div>
          {stats && (
            <div className="flex flex-wrap gap-4 text-xs text-muted mb-2">
              <span>{t('pingport.sent')}: {stats.sent}</span>
              <span>{t('pingport.lost')}: {stats.lost} ({stats.lossPct}%)</span>
              {stats.min !== undefined && <span>min {stats.min}</span>}
              {stats.avg !== undefined && <span>avg {stats.avg}</span>}
              {stats.max !== undefined && <span>max {stats.max}</span>}
            </div>
          )}
          <div className="rounded-lg border border-border bg-surface p-3 h-72 overflow-y-auto font-mono text-xs">
            {log.map((l) => (
              <div key={l.seq} className="flex gap-3 py-0.5">
                <span className="text-muted">{new Date(l.timestamp).toLocaleTimeString()}</span>
                <span className="text-muted">#{l.seq}</span>
                {l.alive ? (
                  <span className="text-ok">{t('pingport.reply')} {l.timeMs} ms</span>
                ) : (
                  <span className="text-danger">{t('pingport.timeout')}</span>
                )}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}
    </div>
  )
}
