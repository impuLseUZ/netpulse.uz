import { cn } from '@/lib/cn'

export function StatusDot({
  tone = 'muted',
  pulse = false,
  className
}: {
  tone?: 'ok' | 'warn' | 'danger' | 'accent' | 'muted'
  pulse?: boolean
  className?: string
}): JSX.Element {
  const color =
    tone === 'ok' ? 'bg-ok' : tone === 'warn' ? 'bg-warn' : tone === 'danger' ? 'bg-danger' : tone === 'accent' ? 'bg-accent' : 'bg-muted'
  return (
    <span className={cn('relative inline-flex w-2 h-2', className)}>
      {pulse && <span className={cn('absolute inset-0 rounded-full animate-ping opacity-60', color)} />}
      <span className={cn('relative inline-block w-2 h-2 rounded-full', color)} />
    </span>
  )
}
