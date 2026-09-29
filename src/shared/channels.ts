/**
 * Имена IPC-каналов, сгруппированные по доменам.
 * Единый источник правды для main (регистрация хендлеров) и preload (вызовы).
 * Формат: '<домен>:<действие>'.
 */
export const CHANNELS = {
  app: {
    getPlatformInfo: "app:getPlatformInfo",
    getSettings: "app:getSettings",
    setSettings: "app:setSettings",
  },
  ipcalc: {
    calculate: "ipcalc:calculate",
    subnet: "ipcalc:subnet",
  },
  dns: {
    lookup: "dns:lookup",
    whois: "dns:whois",
    ssl: "dns:ssl",
  },
  ping: {
    once: "ping:once",
    checkPorts: "ping:checkPorts",
    startContinuous: "ping:startContinuous",
    stopContinuous: "ping:stopContinuous",
    /** Событие main -> renderer: тик непрерывного пинга (ContinuousTick). */
    tickEvent: "ping:tick",
  },
  scanner: {
    detectSubnet: "scanner:detectSubnet",
    start: "scanner:start",
    cancel: "scanner:cancel",
    /** Событие main -> renderer: найден/дополнен хост (ScanHostEvent). */
    hostEvent: "scanner:host",
    /** Событие main -> renderer: прогресс (ScanProgress). */
    progressEvent: "scanner:progress",
  },
  tracer: {
    start: "tracer:start",
    stop: "tracer:stop",
    /** Событие main -> renderer: маршрут со статистикой (TraceRouteEvent). */
    routeEvent: "tracer:route",
    /** Событие main -> renderer: сэмпл для графика (TraceSample). */
    sampleEvent: "tracer:sample",
  },
  speedtest: {
    getNetworkInfo: "speedtest:getNetworkInfo",
  },
  netinfo: {
    getAddresses: "netinfo:getAddresses",
  },
  updater: {
    getState: "updater:getState",
    check: "updater:check",
    download: "updater:download",
    quitAndInstall: "updater:quitAndInstall",
    stateEvent: "updater:state",
  },

  /** ── SSH-клиент (Модуль 8) ── */
  ssh: {
    /** Получить все профили (без паролей/ключей). */
    listProfiles: "ssh:listProfiles",
    /** Сохранить профиль (create или update по id). */
    saveProfile: "ssh:saveProfile",
    /** Удалить профиль по id. */
    deleteProfile: "ssh:deleteProfile",
    /** Открыть SSH-сессию. */
    connect: "ssh:connect",
    /** Закрыть SSH-сессию. */
    disconnect: "ssh:disconnect",
    /** Передать нажатия клавиш в PTY. */
    input: "ssh:input",
    /** Сообщить PTY о новом размере терминала (cols x rows). */
    resize: "ssh:resize",
    /** Push main → renderer: данные из PTY. */
    dataEvent: "ssh:data",
    /** Push main → renderer: изменение статуса сессии. */
    statusEvent: "ssh:status",
  },

  /** ── SFTP файловый менеджер (Модуль 8.2) ── */
  sftp: {
    /** Открыть SFTP-сессию для уже подключённого SSH-клиента. */
    open: "sftp:open",
    /** Закрыть SFTP-сессию. */
    close: "sftp:close",
    /** Листинг директории. */
    list: "sftp:list",
    /** Скачать файл (remote → local). Открывает диалог сохранения. */
    download: "sftp:download",
    /** Загрузить файл (local → remote). Открывает диалог выбора файла. */
    upload: "sftp:upload",
    /** Создать директорию. */
    mkdir: "sftp:mkdir",
    /** Переименовать / переместить. */
    rename: "sftp:rename",
    /** Удалить файл или директорию. */
    delete: "sftp:delete",
    /** Push main → renderer: прогресс передачи файла. */
    progressEvent: "sftp:progress",
    /** Список файлов локальной ФС (для левой панели). */
    localList: "sftp:localList",
    /** Открыть файл/папку через shell.openPath. */
    localOpen: "sftp:localOpen",
    /** Перенести файл local → remote (drag & drop / кнопка). */
    transferToRemote: "sftp:transferToRemote",
    /** Перенести файл remote → local (кнопка Download). */
    transferToLocal: "sftp:transferToLocal",
    /** Отменить активную передачу файла. */
    cancelTransfer: "sftp:cancelTransfer",
  },
} as const;

/** Тип всех строковых значений каналов — для типобезопасности в bridge. */
export type ChannelName =
  | (typeof CHANNELS.app)[keyof typeof CHANNELS.app]
  | (typeof CHANNELS.ipcalc)[keyof typeof CHANNELS.ipcalc]
  | (typeof CHANNELS.dns)[keyof typeof CHANNELS.dns]
  | (typeof CHANNELS.ping)[keyof typeof CHANNELS.ping]
  | (typeof CHANNELS.scanner)[keyof typeof CHANNELS.scanner]
  | (typeof CHANNELS.tracer)[keyof typeof CHANNELS.tracer]
  | (typeof CHANNELS.speedtest)[keyof typeof CHANNELS.speedtest]
  | (typeof CHANNELS.netinfo)[keyof typeof CHANNELS.netinfo]
  | (typeof CHANNELS.updater)[keyof typeof CHANNELS.updater]
  | (typeof CHANNELS.ssh)[keyof typeof CHANNELS.ssh]
  | (typeof CHANNELS.sftp)[keyof typeof CHANNELS.sftp];