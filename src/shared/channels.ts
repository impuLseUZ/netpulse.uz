/**
 * Имена IPC-каналов, сгруппированные по доменам.
 * Единый источник правды для main (регистрация хендлеров) и preload (вызовы).
 * Формат: '<домен>:<действие>'.
 */
export const CHANNELS = {
  app: {
    getPlatformInfo: 'app:getPlatformInfo',
    getSettings: 'app:getSettings',
    setSettings: 'app:setSettings'
  },
  ipcalc: {
    calculate: 'ipcalc:calculate',
    subnet: 'ipcalc:subnet'
  },
  dns: {
    lookup: 'dns:lookup',
    whois: 'dns:whois'
  },
  ping: {
    once: 'ping:once',
    checkPorts: 'ping:checkPorts',
    startContinuous: 'ping:startContinuous',
    stopContinuous: 'ping:stopContinuous',
    /** Событие main -> renderer: тик непрерывного пинга (ContinuousTick). */
    tickEvent: 'ping:tick'
  },
  scanner: {
    detectSubnet: 'scanner:detectSubnet',
    start: 'scanner:start',
    cancel: 'scanner:cancel',
    /** Событие main -> renderer: найден/дополнен хост (ScanHostEvent). */
    hostEvent: 'scanner:host',
    /** Событие main -> renderer: прогресс (ScanProgress). */
    progressEvent: 'scanner:progress'
  },
  tracer: {
    start: 'tracer:start',
    stop: 'tracer:stop',
    /** Событие main -> renderer: маршрут со статистикой (TraceRouteEvent). */
    routeEvent: 'tracer:route',
    /** Событие main -> renderer: сэмпл для графика (TraceSample). */
    sampleEvent: 'tracer:sample'
  },

  updater: {
    getState: 'updater:getState',
    check: 'updater:check',
    download: 'updater:download',
    quitAndInstall: 'updater:quitAndInstall',
    stateEvent: 'updater:state'
  }
} as const

/** Тип всех строковых значений каналов — для типобезопасности в bridge. */
export type ChannelName =
  | (typeof CHANNELS.app)[keyof typeof CHANNELS.app]
  | (typeof CHANNELS.ipcalc)[keyof typeof CHANNELS.ipcalc]
  | (typeof CHANNELS.dns)[keyof typeof CHANNELS.dns]
  | (typeof CHANNELS.ping)[keyof typeof CHANNELS.ping]
  | (typeof CHANNELS.scanner)[keyof typeof CHANNELS.scanner]
  | (typeof CHANNELS.tracer)[keyof typeof CHANNELS.tracer]
  | (typeof CHANNELS.updater)[keyof typeof CHANNELS.updater]
