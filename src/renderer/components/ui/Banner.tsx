import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Info, AlertTriangle, AlertOctagon } from 'lucide-react'
import { cn } from '@/lib/cn'

const tones = {
  info: { wrap: 'bg-accent/8 border-accent/25', icon: 'text-accent', Icon: Info },
  warn: { wrap: 'bg-warn/8 border-warn/25', icon: 'text-warn', Icon: AlertTriangle },
  danger: { wrap: 'bg-danger/8 border-danger/25', icon: 'text-danger', Icon: AlertOctagon }
} as const

/** Replaces the hand-rolled, hardcoded-hex warning boxes in FirewallWarning / SshPasswordPrompt. */
export function Banner({
  tone = 'info',
  icon,
  title,
  children,
  className,
  footer
}: {
  tone?: keyof typeof tones
  icon?: LucideIcon
  title?: string
  children?: ReactNode
  className?: string
  footer?: ReactNode
}): JSX.Element {
  const t = tones[tone]
  const Icon = icon ?? t.Icon
  return (
    <div className={cn('flex gap-2.5 rounded-control border p-3', t.wrap, className)}>
      <Icon size={16} className={cn('shrink-0 mt-0.5', t.icon)} />
      <div className="text-xs leading-relaxed min-w-0">
        {title && <div className={cn('font-medium mb-0.5', t.icon)}>{title}</div>}
        <div className="text-muted">{children}</div>
        {footer}
      </div>
    </div>
  )
}
