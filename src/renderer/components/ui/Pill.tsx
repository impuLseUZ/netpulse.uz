import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

/** Segmented toggle button — unifies the 4 hand-rolled `pillCls`/`TabButton`/`Choice` patterns. */
export function Pill({
  active,
  onClick,
  children,
  size = 'sm'
}: {
  active: boolean
  onClick: () => void
  children: ReactNode
  size?: 'sm' | 'md'
}): JSX.Element {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-control border font-medium transition-colors duration-150 ease-out',
        size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm',
        active
          ? 'bg-accent/12 border-accent/50 text-accent'
          : 'bg-transparent border-border text-muted hover:text-fg hover:border-border-strong'
      )}
    >
      {children}
    </button>
  )
}

export function PillGroup({ children }: { children: ReactNode }): JSX.Element {
  return <div className="flex items-center gap-1.5 flex-wrap">{children}</div>
}
