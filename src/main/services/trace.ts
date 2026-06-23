/**
 * Сервис трассировки (Модуль 2, PingPlotter). Работает в main process.
 * 1) Строит маршрут (raw или системный).
 * 2) Непрерывно пингует каждый хоп по интервалу, копит min/avg/max/loss/jitter.
 * 3) Отдаёт обновлённый маршрут (onRoute) и сэмплы для графика (onSample).
 *
 * Не отвечающие хопы (нет IP) показываем как «нет ответа», без ошибки.
 */
import { promises as dns } from "node:dns";
import { buildRoute } from "./trace-route";
import { createPingProbe, PingProbe } from "./ping-probe";
import { TraceHop, TraceMethod, TraceSample } from "@shared/trace-types";

interface TraceCallbacks {
  onRoute: (data: {
    resolvedIp?: string;
    hops: TraceHop[];
    method: TraceMethod;
    monitoring: boolean;
  }) => void;
  onSample: (sample: Omit<TraceSample, "sessionId">) => void;
}

interface HopState {
  hop: number;
  ip?: string;
  hostname?: string;
  times: number[]; // последние задержки для статистики
  sent: number;
  received: number;
  lastMs?: number;
  prevMs?: number;
  jitterAcc: number;
  jitterCount: number;
}

interface ActiveTrace {
  cancelled: boolean;
  probe: PingProbe;
  timer?: NodeJS.Timeout;
}

const active = new Map<string, ActiveTrace>();

const MAX_TIMES = 200; // ограничиваем историю на хоп

async function reverseDns(ip: string): Promise<string | undefined> {
  try {
    return (await dns.reverse(ip))[0];
  } catch {
    return undefined;
  }
}

function toTraceHop(s: HopState): TraceHop {
  const times = s.times;
  const min = times.length ? Math.min(...times) : undefined;
  const max = times.length ? Math.max(...times) : undefined;
  const avg = times.length
    ? Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 10) / 10
    : undefined;
  const jitter = s.jitterCount
    ? Math.round((s.jitterAcc / s.jitterCount) * 10) / 10
    : undefined;
  const loss = s.sent ? Math.round(((s.sent - s.received) / s.sent) * 100) : 0;
  return {
    hop: s.hop,
    ip: s.ip,
    hostname: s.hostname,
    lastMs: s.lastMs,
    min,
    avg,
    max,
    jitter,
    lossPercent: loss,
    sent: s.sent,
    received: s.received,
  };
}

export async function startTrace(
  sessionId: string,
  target: string,
  opts: {
    maxHops: number;
    intervalMs: number;
    timeoutMs: number;
    resolveNames: boolean;
    preferRaw: boolean;
  },
  cb: TraceCallbacks,
): Promise<void> {
  const state: ActiveTrace = {
    cancelled: false,
    probe: createPingProbe(opts.timeoutMs, false),
  };
  active.set(sessionId, state);

  // 1) Строим маршрут.
  const route = await buildRoute(
    target,
    opts.maxHops,
    opts.timeoutMs,
    opts.preferRaw,
  );

  // Пробу для мониторинга согласуем с методом маршрута:
  // если маршрут построен системным методом — пингуем тоже системным,
  // иначе raw-пробы будут молча давать 100% потерь без admin.
  state.probe.close();
  // const probe = createPingProbe(opts.timeoutMs, route.method === "raw");
  const probe = createPingProbe(opts.timeoutMs, false)
  state.probe = probe;

  if (state.cancelled) {
    probe.close();
    active.delete(sessionId);
    return;
  }

  // Резолвим целевой IP (для подписи).
  let resolvedIp: string | undefined;
  try {
    const last = route.hops[route.hops.length - 1];
    resolvedIp = last?.ip;
  } catch {
    /* ignore */
  }

  const hopStates: HopState[] = route.hops.map((h) => ({
    hop: h.hop,
    ip: h.ip,
    times: [],
    sent: 0,
    received: 0,
    jitterAcc: 0,
    jitterCount: 0,
  }));

  const emitRoute = (monitoring: boolean): void => {
    cb.onRoute({
      resolvedIp,
      hops: hopStates.map(toTraceHop),
      method: route.method,
      monitoring,
    });
  };
  emitRoute(true);

  // Резолвим имена хопов параллельно (не блокируя мониторинг).
  if (opts.resolveNames) {
    void Promise.all(
      hopStates.map(async (s) => {
        if (s.ip) s.hostname = await reverseDns(s.ip);
      }),
    ).then(() => {
      if (!state.cancelled) emitRoute(true);
    });
  }

  // 2) Непрерывный мониторинг: каждый интервал пингуем все отвечающие хопы.
  let busy = false;
  const tick = async (): Promise<void> => {
    if (state.cancelled || busy) return;
    busy = true;
    try {
      await Promise.all(
        hopStates.map(async (s) => {
          if (!s.ip) return; // мёртвый хоп не пингуем
          s.sent++;
          const r = await probe.ping(s.ip);
          console.log('[trace probe]', s.ip, 'alive=', r.alive, 'ms=', r.timeMs, 'method=', probe.method);
          if (r.alive && r.timeMs !== undefined) {
            s.received++;
            s.lastMs = r.timeMs;
            s.times.push(r.timeMs);
            if (s.times.length > MAX_TIMES) s.times.shift();
            if (s.prevMs !== undefined) {
              s.jitterAcc += Math.abs(r.timeMs - s.prevMs);
              s.jitterCount++;
            }
            s.prevMs = r.timeMs;
            cb.onSample({ timestamp: Date.now(), hop: s.hop, ms: r.timeMs });
          } else {
            cb.onSample({ timestamp: Date.now(), hop: s.hop, ms: null });
          }
        }),
      );
      if (!state.cancelled) emitRoute(true);
    } finally {
      busy = false;
    }
  };

  void tick();
  state.timer = setInterval(() => void tick(), opts.intervalMs);
}

export function stopTrace(sessionId: string): void {
  const s = active.get(sessionId);
  if (!s) return;
  s.cancelled = true;
  if (s.timer) clearInterval(s.timer);
  s.probe.close();
  active.delete(sessionId);
}

export function stopAllTraces(): void {
  for (const id of [...active.keys()]) stopTrace(id);
}
