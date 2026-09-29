import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

export function TableShell({ className, ...props }: HTMLAttributes<HTMLDivElement>): JSX.Element {
  return <div className={cn('rounded-card border border-border bg-surface overflow-hidden', className)} {...props} />
}

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>): JSX.Element {
  return <table className={cn('w-full text-sm', className)} {...props} />
}

export function THead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>): JSX.Element {
  return <thead className={cn('bg-surface-2 text-left text-muted text-xs', className)} {...props} />
}

export function TH({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>): JSX.Element {
  return <th className={cn('font-medium px-3 py-2', className)} {...props} />
}

export function TR({ className, ...props }: HTMLAttributes<HTMLTableRowElement>): JSX.Element {
  return <tr className={cn('border-t border-border hover:bg-surface-2/60 transition-colors', className)} {...props} />
}

export function TD({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>): JSX.Element {
  return <td className={cn('px-3 py-2', className)} {...props} />
}
