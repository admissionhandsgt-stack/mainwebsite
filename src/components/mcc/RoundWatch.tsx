"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

/**
 * Keeps an open round page current on result day (2026-10-21). While the result is not yet read,
 * it asks /api/mcc-round-status every 90 seconds (only while the tab is visible) and reloads the page
 * when the state moves on — "out" when MCC posts the PDF, "read" when the analysis is ready.
 * A plain reload, not a router refresh: the edge serves the page, so a thousand open tabs are not
 * a thousand renders.
 */
export default function RoundWatch({
  year,
  round,
  status,
  updating,
  label,
}: {
  year: number;
  round: string;
  status: string;
  updating: boolean;
  label: string;
}) {
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    if (status === "live" && !updating) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      if (stopped) return;
      if (document.visibilityState === "visible") {
        try {
          const r = await fetch(`/api/mcc-round-status?year=${year}&round=${encodeURIComponent(round)}`, { cache: "no-store" });
          if (r.ok) {
            const s: { status: string; updating: boolean } = await r.json();
            if (s.status !== status || s.updating !== updating) {
              setMoving(true);
              setTimeout(() => window.location.reload(), 2500);
              return;
            }
          }
        } catch {
          // offline for a moment: try again on the next beat
        }
      }
      timer = setTimeout(check, 80_000 + Math.random() * 20_000);
    };
    timer = setTimeout(check, 30_000 + Math.random() * 30_000);
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [year, round, status, updating]);

  if (!moving) return null;
  return (
    <div role="status" className="fixed inset-x-0 bottom-4 z-50 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-2 rounded-full border border-primary/30 bg-card px-4 py-2.5 text-sm font-semibold text-foreground shadow-lift">
      <RefreshCw className="h-4 w-4 shrink-0 animate-spin text-primary" aria-hidden="true" />
      {label}
    </div>
  );
}
