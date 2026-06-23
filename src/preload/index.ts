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
};

export type NetPulseApi = typeof api;

contextBridge.exposeInMainWorld("netpulse", api);
