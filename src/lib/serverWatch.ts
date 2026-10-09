import http from "node:http";

/**
 * Twice on 2026-10-09 the app's memory ran to its limit within minutes of a
 * deploy restart — once a JS heap OOM at ~790 MB, once 2.5 GB resident and
 * 700 MB in swap with every request timing out. Neither reproduced: cold
 * replays of every sitemap page, smoke and the signed-in gate suite all stayed
 * under 350 MB. So what was running at the time is the missing fact, and this
 * records it.
 *
 * - Every request is tracked from arrival until its response closes.
 * - Above WATCH_MB resident, the memory breakdown (heap against off-heap
 *   buffers — the two point to different causes) is logged with the oldest
 *   requests still in flight, at most every 15 s.
 * - Any request slower than SLOW_MS is logged when it finishes.
 *
 * Nothing here holds a body or a header beyond the user-agent, and it logs to
 * stdout only — `docker logs admissionhands-app-1 | grep '\[watch\]'`.
 */
const WATCH_MB = 700;
const SLOW_MS = 8000;
const MB = 1024 * 1024;

type Flight = { url: string; ua: string; at: number };

export function startServerWatch() {
  const g = globalThis as { __ahWatch?: boolean };
  if (g.__ahWatch) return;
  g.__ahWatch = true;

  const inflight = new Map<number, Flight>();
  let seq = 0;
  const emit = http.Server.prototype.emit;
  http.Server.prototype.emit = function (this: http.Server, event: string, ...args: unknown[]) {
    if (event === "request") {
      const [req, res] = args as [http.IncomingMessage, http.ServerResponse];
      const id = ++seq;
      const f: Flight = {
        url: `${req.method} ${(req.url ?? "").slice(0, 160)}`,
        ua: String(req.headers["user-agent"] ?? "").slice(0, 60),
        at: Date.now(),
      };
      inflight.set(id, f);
      res.once("close", () => {
        inflight.delete(id);
        const ms = Date.now() - f.at;
        if (ms > SLOW_MS) console.warn(`[watch] slow ${ms}ms ${res.statusCode} ${f.url} ua="${f.ua}"`);
      });
    }
    return emit.call(this, event, ...args);
  } as typeof http.Server.prototype.emit;

  const mb = (n: number) => Math.round(n / MB);
  setInterval(() => {
    const m = process.memoryUsage();
    if (m.rss < WATCH_MB * MB) return;
    const now = Date.now();
    const oldest = [...inflight.values()]
      .sort((a, b) => a.at - b.at)
      .slice(0, 12)
      .map((f) => `${Math.round((now - f.at) / 1000)}s ${f.url} ua="${f.ua}"`);
    console.warn(
      `[watch] rss=${mb(m.rss)}MB heapUsed=${mb(m.heapUsed)}MB heapTotal=${mb(m.heapTotal)}MB ` +
        `external=${mb(m.external)}MB arrayBuffers=${mb(m.arrayBuffers)}MB inflight=${inflight.size}` +
        (oldest.length ? `\n  ${oldest.join("\n  ")}` : ""),
    );
  }, 15_000).unref();
}
