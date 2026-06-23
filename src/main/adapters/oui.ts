/**
 * Определение производителя по OUI (первые 3 байта MAC).
 * Встроена компактная база популярных префиксов. Для полной базы IEEE
 * можно положить файл oui.json (карта "AABBCC" -> "Vendor") в resources
 * и подгрузить через loadOuiDatabase().
 *
 * Это локальная база — без обращения в интернет (требование SKILL).
 */

/** Встроенный набор частых OUI (префикс из 6 hex без разделителей -> вендор). */
const BUILTIN_OUI: Record<string, string> = {
  '000c29': 'VMware',
  '005056': 'VMware',
  '001c14': 'VMware',
  '080027': 'VirtualBox',
  '0a0027': 'VirtualBox',
  '525400': 'QEMU/KVM',
  '001a11': 'Google',
  '3c5ab4': 'Google',
  'f4f5e8': 'Google',
  'd85d4c': 'TP-Link',
  '50c7bf': 'TP-Link',
  '0c8063': 'TP-Link',
  'b0487a': 'TP-Link',
  'ec086b': 'TP-Link',
  '001018': 'Broadcom',
  'a4c3f0': 'Intel',
  '001b21': 'Intel',
  '3ca067': 'Intel',
  '8c1645': 'Intel',
  '001e8c': 'ASUS',
  '2c56dc': 'ASUS',
  '38d547': 'ASUS',
  'd017c2': 'ASUS',
  '0023ae': 'Dell',
  'd4be d9': 'Dell',
  'f8bc12': 'Dell',
  '001cf0': 'D-Link',
  '14d64d': 'D-Link',
  'bcf685': 'D-Link',
  '000e8f': 'Cisco',
  '001a2f': 'Cisco',
  '00226b': 'Cisco-Linksys',
  '60634c': 'Apple',
  'a4d18c': 'Apple',
  'f0db e2': 'Apple',
  'ac87a3': 'Apple',
  '3c0754': 'Apple',
  'd0817a': 'Apple',
  '001632': 'Samsung',
  '5001bb': 'Samsung',
  'e8508b': 'Samsung',
  'c4731e': 'Samsung',
  '0017c2': 'Xiaomi',
  '286c07': 'Xiaomi',
  '64b473': 'Xiaomi',
  '784476': 'Huawei',
  '00259e': 'Huawei',
  '480031': 'Huawei',
  '001967': 'MikroTik',
  '4c5e0c': 'MikroTik',
  '64d154': 'MikroTik',
  '6c3b6b': 'MikroTik',
  'dca632': 'Raspberry Pi',
  'b827eb': 'Raspberry Pi',
  'e45f01': 'Raspberry Pi',
  '2ccf67': 'Raspberry Pi'
}

/** Расширенная база, подгружаемая из файла (если есть). */
let extendedOui: Record<string, string> | null = null

/** Загрузить расширенную OUI-базу (карта "AABBCC" -> вендор). */
export function loadOuiDatabase(db: Record<string, string>): void {
  extendedOui = db
}

/** Вендор по MAC (любой формат с разделителями или без). */
export function vendorForMac(mac: string | undefined): string | undefined {
  if (!mac) return undefined
  const hex = mac.replace(/[^0-9a-fA-F]/g, '').toLowerCase()
  if (hex.length < 6) return undefined
  const prefix = hex.slice(0, 6)
  // Нормализуем ключи встроенной базы (в ней есть пара опечаток с пробелами — чистим).
  if (extendedOui && extendedOui[prefix.toUpperCase()]) {
    return extendedOui[prefix.toUpperCase()]
  }
  for (const [key, vendor] of Object.entries(BUILTIN_OUI)) {
    if (key.replace(/\s/g, '').toLowerCase() === prefix) return vendor
  }
  return undefined
}
