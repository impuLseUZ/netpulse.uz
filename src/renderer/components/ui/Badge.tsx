import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

const tones = {
  neutral: 'bg-surface-2 text-muted',
  accent: 'bg-accent/12 text-accent',
  ok: 'bg-ok/12 text-ok',
  warn: 'bg-warn/12 text-warn',
  danger: 'bg-danger/12 text-danger'
}

export function Badge({
  tone = 'neutral',
  children,
  className
}: {
  tone?: keyof typeof tones
  children: ReactNode
  className?: string
}): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium leading-none',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  )
}
