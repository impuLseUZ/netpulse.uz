import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  mono?: boolean
}

/** Inset field — slightly darker than surroundings, per design direction. */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { mono = true, className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full h-10 px-3 rounded-control bg-surface-2 border border-border text-sm text-fg',
        'placeholder:text-muted outline-none transition-colors duration-150',
        'focus:border-accent focus:shadow-focus-ring',
        mono && 'font-mono tabular-nums',
        className
      )}
      {...props}
    />
  )
})
