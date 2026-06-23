/**
 * IPC-домен 'dns': DNS-запросы и WHOIS (Модуль 5).
 */
import { CHANNELS } from '@shared/channels'
import { DnsLookupResult, DnsQuery, WhoisQuery, WhoisResult } from '@shared/dns-types'
import { dnsLookup } from '../services/dns'
import { whoisLookup } from '../services/whois'
import { handle } from './handle'

export function registerDnsIpc(): void {
  handle<DnsLookupResult>(CHANNELS.dns.lookup, (query) => dnsLookup(query as DnsQuery))
  handle<WhoisResult>(CHANNELS.dns.whois, (query) => whoisLookup(query as WhoisQuery))
}
