import { cn } from '@/lib/cn'

export function Toggle({
  checked,
  onChange,
  label
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
}): JSX.Element {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors duration-150 ease-out',
        checked ? 'bg-accent' : 'bg-surface-3 border border-border'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-knob shadow-elevate-1 transition-transform duration-150 ease-out',
          checked ? 'translate-x-[22px]' : 'translate-x-1'
        )}
      />
    </button>
  )
}
