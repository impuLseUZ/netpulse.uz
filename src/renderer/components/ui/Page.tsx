import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function PageContainer({
  children,
  maxWidth = 'max-w-4xl'
}: {
  children: ReactNode
  maxWidth?: string
}): JSX.Element {
  return <div className={cn('p-8 mx-auto w-full', maxWidth)}>{children}</div>
}

export function PageHeader({
  icon: Icon,
  title,
  meta
}: {
  icon: LucideIcon
  title: string
  meta?: ReactNode
}): JSX.Element {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2.5">
        <Icon size={18} className="text-accent" />
        {title}
      </h2>
      {meta && <div className="text-xs text-muted">{meta}</div>}
    </div>
  )
}
