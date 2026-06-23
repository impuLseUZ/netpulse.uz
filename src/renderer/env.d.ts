import type { NetPulseApi } from '../../preload'

declare global {
  interface Window {
    netpulse: NetPulseApi
  }
}

export {}
