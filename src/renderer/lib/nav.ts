import {
  Radar,
  Route,
  Calculator,
  Network,
  Globe,
  Gauge,
  KeyRound,
  Settings,
  type LucideIcon
} from 'lucide-react'

export type ModuleId =
  | 'scanner'
  | 'tracer'
  | 'ipcalc'
  | 'pingport'
  | 'dns'
  | 'speedtest'
  | 'password'
  | 'settings'

export interface NavItem {
  id: ModuleId
  /** ключ в i18n: nav.<labelKey> */
  labelKey: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'scanner', labelKey: 'scanner', icon: Radar },
  { id: 'tracer', labelKey: 'tracer', icon: Route },
  { id: 'ipcalc', labelKey: 'ipcalc', icon: Calculator },
  { id: 'pingport', labelKey: 'pingport', icon: Network },
  { id: 'dns', labelKey: 'dns', icon: Globe },
  { id: 'speedtest', labelKey: 'speedtest', icon: Gauge },
  { id: 'password', labelKey: 'password', icon: KeyRound }
]

export const SETTINGS_ITEM: NavItem = {
  id: 'settings',
  labelKey: 'settings',
  icon: Settings
}