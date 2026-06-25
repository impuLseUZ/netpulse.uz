import { contextBridge, ipcRenderer, IpcRendererEvent } from "electron";
import { CHANNELS } from "@shared/channels";
import {
  AppSettings,
  IpcResult,
  PlatformInfo,
  UpdateState,
} from "@shared/types";
import {
  DnsLookupResult,
  DnsQuery,
  WhoisQuery,
  WhoisResult,
  SslQuery,
  SslResult,
} from "@shared/dns-types";
import {
  ContinuousStartQuery,
  ContinuousTick,
  PortCheckQuery,
  PingResult,
  PortResult,
} from "@shared/pingport-types";
import {
  LocalSubnet,
  ScanHostEvent,
  ScanProgress,
  ScanQuery,
} from "@shared/scanner-types";
import {
  TraceRouteEvent,
  TraceSample,
  TraceStartQuery,
} from "@shared/trace-types";
import { NetworkInfo } from "@shared/speedtest-types";
import { NetAddresses } from "@shared/netinfo-types";
import {
  SshProfile,
  SshProfilePublic,
  SshConnectQuery,
  SshResizeQuery,
  SshInputQuery,
  SshDataEvent,
  SshStatusEvent,
  SftpListQuery,
  SftpListResult,
  SftpDownloadQuery,
  SftpUploadQuery,
  SftpMkdirQuery,
  SftpRenameQuery,
  SftpDeleteQuery,
  SftpProgressEvent,
  LocalListQuery,
  LocalListResult,
  SftpTransferQuery,
} from "@shared/ssh-types";

/**
 * Единственный мост renderer <-> main.
 * nodeIntegration выключен; renderer не видит ipcRenderer напрямую.
 */
const api = {
  app: {
    getPlatformInfo: (): Promise<IpcResult<PlatformInfo>> =>
      ipcRenderer.invoke(CHANNELS.app.getPlatformInfo),
    getSettings: (): Promise<IpcResult<AppSettings>> =>
      ipcRenderer.invoke(CHANNELS.app.getSettings),
    setSettings: (
      patch: Partial<AppSettings>,
    ): Promise<IpcResult<AppSettings>> =>
      ipcRenderer.invoke(CHANNELS.app.setSettings, patch),
  },

  dns: {
    lookup: (query: DnsQuery): Promise<IpcResult<DnsLookupResult>> =>
      ipcRenderer.invoke(CHANNELS.dns.lookup, query),
    whois: (query: WhoisQuery): Promise<IpcResult<WhoisResult>> =>
      ipcRenderer.invoke(CHANNELS.dns.whois, query),
    ssl: (query: SslQuery): Promise<IpcResult<SslResult>> =>
      ipcRenderer.invoke(CHANNELS.dns.ssl, query),
  },

  ping: {
    once: (host: string, timeoutMs?: number): Promise<IpcResult<PingResult>> =>
      ipcRenderer.invoke(CHANNELS.ping.once, { host, timeoutMs }),
    checkPorts: (query: PortCheckQuery): Promise<IpcResult<PortResult[]>> =>
      ipcRenderer.invoke(CHANNELS.ping.checkPorts, query),
    startContinuous: (query: ContinuousStartQuery): Promise<IpcResult<void>> =>
      ipcRenderer.invoke(CHANNELS.ping.startContinuous, query),
    stopContinuous: (sessionId: string): Promise<IpcResult<void>> =>
      ipcRenderer.invoke(CHANNELS.ping.stopContinuous, { sessionId }),
    onTick: (cb: (tick: ContinuousTick) => void): (() => void) => {
      const listener = (_e: IpcRendererEvent, tick: ContinuousTick): void =>
        cb(tick);
      ipcRenderer.on(CHANNELS.ping.tickEvent, listener);
      return () =>
        ipcRenderer.removeListener(CHANNELS.ping.tickEvent, listener);
    },
  },

  scanner: {
    detectSubnet: (): Promise<IpcResult<LocalSubnet | null>> =>
      ipcRenderer.invoke(CHANNELS.scanner.detectSubnet),
    start: (query: ScanQuery): Promise<IpcResult<void>> =>
      ipcRenderer.invoke(CHANNELS.scanner.start, query),
    cancel: (sessionId: string): Promise<IpcResult<void>> =>
      ipcRenderer.invoke(CHANNELS.scanner.cancel, { sessionId }),
    onHost: (cb: (ev: ScanHostEvent) => void): (() => void) => {
      const listener = (_e: IpcRendererEvent, ev: ScanHostEvent): void =>
        cb(ev);
      ipcRenderer.on(CHANNELS.scanner.hostEvent, listener);
      return () =>
        ipcRenderer.removeListener(CHANNELS.scanner.hostEvent, listener);
    },
    onProgress: (cb: (ev: ScanProgress) => void): (() => void) => {
      const listener = (_e: IpcRendererEvent, ev: ScanProgress): void => cb(ev);
      ipcRenderer.on(CHANNELS.scanner.progressEvent, listener);
      return () =>
        ipcRenderer.removeListener(CHANNELS.scanner.progressEvent, listener);
    },
  },

  tracer: {
    start: (query: TraceStartQuery): Promise<IpcResult<void>> =>
      ipcRenderer.invoke(CHANNELS.tracer.start, query),
    stop: (sessionId: string): Promise<IpcResult<void>> =>
      ipcRenderer.invoke(CHANNELS.tracer.stop, { sessionId }),
    onRoute: (cb: (ev: TraceRouteEvent) => void): (() => void) => {
      const listener = (_e: IpcRendererEvent, ev: TraceRouteEvent): void =>
        cb(ev);
      ipcRenderer.on(CHANNELS.tracer.routeEvent, listener);
      return () =>
        ipcRenderer.removeListener(CHANNELS.tracer.routeEvent, listener);
    },
    onSample: (cb: (ev: TraceSample) => void): (() => void) => {
      const listener = (_e: IpcRendererEvent, ev: TraceSample): void => cb(ev);
      ipcRenderer.on(CHANNELS.tracer.sampleEvent, listener);
      return () =>
        ipcRenderer.removeListener(CHANNELS.tracer.sampleEvent, listener);
    },
  },

  speedtest: {
    getNetworkInfo: (): Promise<IpcResult<NetworkInfo>> =>
      ipcRenderer.invoke(CHANNELS.speedtest.getNetworkInfo),
  },

  netinfo: {
    getAddresses: (): Promise<IpcResult<NetAddresses>> =>
      ipcRenderer.invoke(CHANNELS.netinfo.getAddresses),
  },

  updater: {
    getState: (): Promise<IpcResult<UpdateState>> =>
      ipcRenderer.invoke(CHANNELS.updater.getState),
    check: (): Promise<IpcResult<void>> =>
      ipcRenderer.invoke(CHANNELS.updater.check),
    download: (): Promise<IpcResult<void>> =>
      ipcRenderer.invoke(CHANNELS.updater.download),
    quitAndInstall: (): Promise<IpcResult<void>> =>
      ipcRenderer.invoke(CHANNELS.updater.quitAndInstall),
    onState: (cb: (state: UpdateState) => void): (() => void) => {
      const listener = (_e: IpcRendererEvent, state: UpdateState): void =>
        cb(state);
      ipcRenderer.on(CHANNELS.updater.stateEvent, listener);
      return () =>
        ipcRenderer.removeListener(CHANNELS.updater.stateEvent, listener);
    },
  },

  /** ── SSH-клиент (Модуль 8) ── */
  ssh: {
    listProfiles: (): Promise<IpcResult<SshProfilePublic[]>> =>
      ipcRenderer.invoke(CHANNELS.ssh.listProfiles),

    saveProfile: (profile: SshProfile): Promise<IpcResult<SshProfilePublic>> =>
      ipcRenderer.invoke(CHANNELS.ssh.saveProfile, profile),

    deleteProfile: (id: string): Promise<IpcResult<void>> =>
      ipcRenderer.invoke(CHANNELS.ssh.deleteProfile, { id }),

    connect: (query: SshConnectQuery): Promise<IpcResult<void>> =>
      ipcRenderer.invoke(CHANNELS.ssh.connect, query),

    disconnect: (sessionId: string): Promise<IpcResult<void>> =>
      ipcRenderer.invoke(CHANNELS.ssh.disconnect, { sessionId }),

    input: (query: SshInputQuery): Promise<IpcResult<void>> =>
      ipcRenderer.invoke(CHANNELS.ssh.input, query),

    resize: (query: SshResizeQuery): Promise<IpcResult<void>> =>
      ipcRenderer.invoke(CHANNELS.ssh.resize, query),

    /** Подписка на данные PTY. Возвращает функцию отписки. */
    onData: (cb: (ev: SshDataEvent) => void): (() => void) => {
      const listener = (_e: IpcRendererEvent, ev: SshDataEvent): void => cb(ev);
      ipcRenderer.on(CHANNELS.ssh.dataEvent, listener);
      return () =>
        ipcRenderer.removeListener(CHANNELS.ssh.dataEvent, listener);
    },

    /** Подписка на изменения статуса сессии. Возвращает функцию отписки. */
    onStatus: (cb: (ev: SshStatusEvent) => void): (() => void) => {
      const listener = (_e: IpcRendererEvent, ev: SshStatusEvent): void =>
        cb(ev);
      ipcRenderer.on(CHANNELS.ssh.statusEvent, listener);
      return () =>
        ipcRenderer.removeListener(CHANNELS.ssh.statusEvent, listener);
    },
  },

  /** ── SFTP файловый менеджер (Модуль 8.2) ── */
  sftp: {
    open: (sessionId: string): Promise<IpcResult<void>> =>
      ipcRenderer.invoke(CHANNELS.sftp.open, { sessionId }),

    close: (sessionId: string): Promise<IpcResult<void>> =>
      ipcRenderer.invoke(CHANNELS.sftp.close, { sessionId }),

    list: (query: SftpListQuery): Promise<IpcResult<SftpListResult>> =>
      ipcRenderer.invoke(CHANNELS.sftp.list, query),

    download: (query: SftpDownloadQuery): Promise<IpcResult<void>> =>
      ipcRenderer.invoke(CHANNELS.sftp.download, query),

    upload: (query: SftpUploadQuery): Promise<IpcResult<void>> =>
      ipcRenderer.invoke(CHANNELS.sftp.upload, query),

    mkdir: (query: SftpMkdirQuery): Promise<IpcResult<void>> =>
      ipcRenderer.invoke(CHANNELS.sftp.mkdir, query),

    rename: (query: SftpRenameQuery): Promise<IpcResult<void>> =>
      ipcRenderer.invoke(CHANNELS.sftp.rename, query),

    delete: (query: SftpDeleteQuery): Promise<IpcResult<void>> =>
      ipcRenderer.invoke(CHANNELS.sftp.delete, query),

    localList: (query: LocalListQuery & { getHome?: boolean }): Promise<IpcResult<LocalListResult>> =>
      ipcRenderer.invoke(CHANNELS.sftp.localList, query),

    transferToRemote: (query: SftpTransferQuery): Promise<IpcResult<void>> =>
      ipcRenderer.invoke(CHANNELS.sftp.transferToRemote, query),

    transferToLocal: (query: SftpTransferQuery): Promise<IpcResult<void>> =>
      ipcRenderer.invoke(CHANNELS.sftp.transferToLocal, query),

    onProgress: (cb: (ev: SftpProgressEvent) => void): (() => void) => {
      const listener = (_e: IpcRendererEvent, ev: SftpProgressEvent): void => cb(ev);
      ipcRenderer.on(CHANNELS.sftp.progressEvent, listener);
      return () =>
        ipcRenderer.removeListener(CHANNELS.sftp.progressEvent, listener);
    },
  },
};

export type NetPulseApi = typeof api;

contextBridge.exposeInMainWorld("netpulse", api);