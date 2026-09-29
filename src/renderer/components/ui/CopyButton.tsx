import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/cn'

/** Unifies the 4 separate copy-to-clipboard implementations found across pages. */
export function CopyButton({
  value,
  className,
  size = 13
}: {
  value: string
  className?: string
  size?: number
}): JSX.Element {
  const [copied, setCopied] = useState(false)

  const onClick = (): void => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    })
  }

  return (
    <button
      onClick={onClick}
      aria-label="Copy"
      title="Copy"
      className={cn(
        'inline-flex items-center justify-center w-6 h-6 rounded-md text-muted hover:text-fg hover:bg-surface-2 transition-colors',
        className
      )}
    >
      {copied ? <Check size={size} className="text-ok" /> : <Copy size={size} />}
    </button>
  )
}
