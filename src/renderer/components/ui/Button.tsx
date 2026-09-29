import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'sm' | 'md'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-control font-medium ' +
  'transition-colors duration-150 ease-out disabled:opacity-50 disabled:pointer-events-none ' +
  'active:scale-[0.97] focus-visible:outline-none focus-visible:shadow-focus-ring'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg hover:brightness-110',
  secondary: 'bg-surface-2 text-fg border border-border hover:bg-surface-3 hover:border-border-strong',
  danger: 'bg-danger text-white hover:brightness-110',
  ghost: 'text-muted hover:text-fg hover:bg-surface-2'
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', className, ...props },
  ref
) {
  return (
    <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props} />
  )
})
