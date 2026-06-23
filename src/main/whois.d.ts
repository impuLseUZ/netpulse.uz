/**
 * Минимальная декларация типов для пакета 'whois' (нет официальных @types).
 */
declare module 'whois' {
  interface LookupOptions {
    server?: string | { host: string; port?: number }
    follow?: number
    timeout?: number
    verbose?: boolean
    bind?: string | null
  }
  type LookupCallback = (err: Error | null, data: string) => void
  function lookup(addr: string, callback: LookupCallback): void
  function lookup(addr: string, options: LookupOptions, callback: LookupCallback): void
  export { lookup }
}
