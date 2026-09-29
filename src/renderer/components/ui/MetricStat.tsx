import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/**
 * Metric display with real hierarchy: one hero reading (28px/600, tabular
 * mono, accent) plus demoted secondary readings (13px/500, muted label).
 * Replaces the equal-size MetricCard grids repeated across pages.
 */
export function MetricHero({
  label,
  value,
  unit,
  active = false,
  tone = 'accent'
}: {
  label: string
  value: string
  unit?: string
  active?: boolean
  tone?: 'accent' | 'ok' | 'muted'
}): JSX.Element {
  const color = tone === 'accent' ? 'text-accent' : tone === 'ok' ? 'text-ok' : 'text-fg'
  return (
    <div>
      <div className="text-[11px] font-medium tracking-wide uppercase text-muted mb-0.5 flex items-center gap-1.5">
        {label}
        {active && <span className="inline-block w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />}
      </div>
      <div className={cn('font-mono tabular-nums text-[28px] font-semibold leading-tight', color)}>
        {value}
        {unit && <span className="text-xs font-normal text-muted ml-1.5">{unit}</span>}
      </div>
    </div>
  )
}

export function MetricSecondary({
  label,
  value,
  unit,
  active = false
}: {
  label: string
  value: string
  unit?: string
  active?: boolean
}): JSX.Element {
  return (
    <div
      className={cn(
        'rounded-control px-3 py-2 transition-colors duration-150',
        active ? 'bg-accent/10 ring-1 ring-accent/30' : 'bg-surface-2'
      )}
    >
      <div className="text-[10px] font-medium text-muted uppercase tracking-wide">{label}</div>
      <div className={cn('font-mono tabular-nums text-sm font-medium mt-0.5', active ? 'text-accent' : 'text-fg')}>
        {value}
        {unit && <span className="text-[11px] font-normal text-muted ml-1">{unit}</span>}
      </div>
    </div>
  )
}

export function MetricRow({ children }: { children: ReactNode }): JSX.Element {
  return <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{children}</div>
}
