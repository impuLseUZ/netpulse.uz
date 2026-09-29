import type { LucideIcon } from 'lucide-react'

export function EmptyState({
  icon: Icon,
  title,
  hint
}: {
  icon: LucideIcon
  title: string
  hint?: string
}): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-14 text-center">
      <Icon size={28} strokeWidth={1.5} className="text-muted/50" />
      <p className="text-sm text-muted">{title}</p>
      {hint && <p className="text-xs text-muted/70 max-w-xs">{hint}</p>}
    </div>
  )
}
