/**
 * Сетевые адреса хоста для шапки приложения.
 * Любое из полей может отсутствовать:
 *  - external нет, если нет интернета / Cloudflare недоступен;
 *  - local нет, если не найден активный (не loopback) IPv4-интерфейс.
 */
export interface NetAddresses {
  /** Внешний IP, как его видит интернет (через Cloudflare trace). */
  external?: string
  /** Локальный IPv4 активного сетевого интерфейса. */
  local?: string
  /** Имя интерфейса локального адреса (например "Ethernet", "wlan0"). */
  ifaceName?: string
}
