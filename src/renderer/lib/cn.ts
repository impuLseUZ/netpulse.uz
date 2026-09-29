type ClassValue = string | number | false | null | undefined

/** Joins class names, dropping falsy values. No conflict resolution — keep call sites non-contradictory. */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ')
}
