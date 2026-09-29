import { useEffect, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * Hand-rolled dialog shell (no headless dep in this project). Owns the full
 * behavior contract: focus trap, Escape-to-close, click-outside, return
 * focus on unmount — replaces two independent hand-rolled modals that had
 * none of this.
 */
export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  widthClassName = 'max-w-md',
  bodyClassName
}: {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  footer?: ReactNode
  widthClassName?: string
  bodyClassName?: string
}): JSX.Element | null {
  const panelRef = useRef<HTMLDivElement>(null)
  const previouslyFocused = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    previouslyFocused.current = document.activeElement as HTMLElement
    const panel = panelRef.current
    const focusable = panel?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    focusable?.[0]?.focus()

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab' || !focusable || focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      previouslyFocused.current?.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'w-full flex flex-col max-h-[90vh] rounded-modal border border-border-strong bg-surface shadow-elevate-2 animate-pop-in',
          widthClassName
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
            <h2 className="text-sm font-semibold">{title}</h2>
            <button onClick={onClose} className="text-muted hover:text-fg transition-colors" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        )}
        <div className={cn('p-5 overflow-y-auto flex-1', bodyClassName)}>{children}</div>
        {footer && <div className="flex justify-end gap-2 px-5 py-4 border-t border-border shrink-0">{footer}</div>}
      </div>
    </div>
  )
}
