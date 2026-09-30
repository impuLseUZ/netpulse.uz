import {
  Radar,
  Route,
  Calculator,
  Network,
  Globe,
  Gauge,
  KeyRound,
  Terminal,
  Settings,
  ListTree,
  ScanSearch,
  ServerCog,
  KeySquare,
  Webhook,
  type LucideIcon
} from 'lucide-react'

export type ModuleId =
  | 'scanner'
  | 'tracer'
  | 'ipcalc'
  | 'pingport'
  | 'dns'
  | 'subdomains'
  | 'portscan'
  | 'localports'
  | 'httpinspect'
  | 'speedtest'
  | 'password'
  | 'sshkeys'
  | 'ssh'
  | 'settings'

export interface NavItem {
  id: ModuleId
  /** ключ в i18n: nav.<labelKey> */
  labelKey: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'scanner', labelKey: 'scanner', icon: Radar },
  { id: 'portscan', labelKey: 'portscan', icon: ScanSearch },
  { id: 'localports', labelKey: 'localports', icon: ServerCog },
  { id: 'tracer', labelKey: 'tracer', icon: Route },
  { id: 'ipcalc', labelKey: 'ipcalc', icon: Calculator },
  { id: 'pingport', labelKey: 'pingport', icon: Network },
  { id: 'dns', labelKey: 'dns', icon: Globe },
  { id: 'subdomains', labelKey: 'subdomains', icon: ListTree },
  { id: 'httpinspect', labelKey: 'httpinspect', icon: Webhook },
  { id: 'speedtest', labelKey: 'speedtest', icon: Gauge },
  { id: 'password', labelKey: 'password', icon: KeyRound },
  { id: 'sshkeys', labelKey: 'sshkeys', icon: KeySquare },
  { id: 'ssh', labelKey: 'ssh', icon: Terminal },
]

export const SETTINGS_ITEM: NavItem = {
  id: 'settings',
  labelKey: 'settings',
  icon: Settings,
}