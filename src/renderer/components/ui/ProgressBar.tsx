import { cn } from '@/lib/cn'

export function ProgressBar({
  fraction,
  tone = 'accent',
  className
}: {
  /** 0..1 */
  fraction: number
  tone?: 'accent' | 'ok' | 'warn' | 'danger'
  className?: string
}): JSX.Element {
  const fill = tone === 'accent' ? 'bg-accent' : tone === 'ok' ? 'bg-ok' : tone === 'warn' ? 'bg-warn' : 'bg-danger'
  const pct = Math.max(0, Math.min(1, fraction)) * 100
  return (
    <div className={cn('h-1.5 rounded-full bg-surface-2 overflow-hidden', className)}>
      <div
        className={cn('h-full rounded-full transition-[width] duration-300 ease-out', fill)}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
