"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { hardNavigateToExcluded, trackerAllowed } from "@/lib/trackingGuard";

/**
 * The Meta pixel (2026-11-11, owner: "meta pixel kardo"): audiences for the WhatsApp and Meta campaigns, and Lead /
 * CompleteRegistration / Contact events (lib/analytics.ts metaTrack). The dataset ID is Admin → Content → "Site
 * verification" (`analytics.meta_pixel.id`); with none, nothing renders.
 *
 * - Only after the visitor says OK on a one-line notice (India's DPDP Act: consent before tracking for advertising).
 *   The answer is a cookie, `ah_consent` = yes | no, a year — so the server (Conversions API, later) reads the same.
 * - Never on the predictor, sign-in, account or admin pages, nor on an address carrying a rank or phone
 *   (lib/trackingGuard.ts); a click from a tracked page to such a page becomes a full page load.
 * - autoConfig off: Meta does not read buttons or form fields by itself. Standard events only, never a name, phone or rank.
 */
type Copy = { text: string; accept: string; decline: string; privacy: string };

const readConsent = (): "yes" | "no" | null => {
  const m = document.cookie.match(/(?:^|;\s*)ah_consent=(yes|no)/);
  return (m?.[1] as "yes" | "no" | undefined) ?? null;
};
const writeConsent = (v: "yes" | "no") => {
  document.cookie = `ah_consent=${v}; Max-Age=${365 * 86400}; Path=/; SameSite=Lax; Secure`;
};

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue?: unknown[]; push?: unknown; loaded?: boolean; version?: string };

function loadPixel(id: string) {
  const w = window as unknown as { fbq?: Fbq; _fbq?: Fbq };
  if (w.fbq) return;
  const n = function (...args: unknown[]) {
    if (n.callMethod) n.callMethod(...args);
    else n.queue!.push(args);
  } as Fbq;
  n.push = n;
  n.loaded = true;
  n.version = "2.0";
  n.queue = [];
  w.fbq = n;
  w._fbq = n;
  const t = document.createElement("script");
  t.async = true;
  t.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(t);
  n("set", "autoConfig", false, id);
  n("init", id);
}

export default function MetaPixel({ id, copy }: { id: string; copy: Copy }) {
  const pathname = usePathname();
  const [consent, setConsent] = useState<"yes" | "no" | null | "unknown">("unknown");
  const [allowed, setAllowed] = useState(false);
  // The notice waits for the visitor's first scroll, tap or key (2026-11-11): drawn on load it was the largest text a
  // phone painted after hydration, so it *was* the page's Largest Contentful Paint (4.1 s on a PG college page, the
  // content itself at 1.4 s). LCP stops counting at the first input, and the pixel waits for consent either way.
  const [engaged, setEngaged] = useState(false);

  useEffect(() => {
    setConsent(readConsent());
    const on = () => setEngaged(true);
    const events = ["scroll", "pointerdown", "keydown", "touchstart"] as const;
    for (const e of events) window.addEventListener(e, on, { once: true, passive: true });
    return () => {
      for (const e of events) window.removeEventListener(e, on);
    };
  }, []);

  // Each page view: only on pages a tracker may run on.
  useEffect(() => {
    const ok = /^\d{6,20}$/.test(id) && trackerAllowed(new URL(window.location.href));
    setAllowed(ok);
    if (!ok || consent !== "yes") return;
    loadPixel(id);
    (window as unknown as { fbq: Fbq }).fbq("track", "PageView");
  }, [id, consent, pathname]);

  useEffect(() => {
    if (consent !== "yes" || !allowed) return;
    return hardNavigateToExcluded();
  }, [consent, allowed]);

  if (consent !== null || !allowed || !engaged) return null;
  return (
    <div
      role="region"
      aria-label="Cookie choice"
      className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-xl rounded-2xl border border-border bg-card/95 p-3 text-[13px] leading-snug text-foreground shadow-lift backdrop-blur sm:left-4 sm:right-auto sm:mx-0"
    >
      <p>
        {copy.text}{" "}
        <a href="/terms#cookies" className="font-semibold text-primary-strong underline-offset-2 hover:underline">
          {copy.privacy}
        </a>
      </p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => {
            writeConsent("yes");
            setConsent("yes");
          }}
          className="inline-flex min-h-9 items-center rounded-xl bg-primary-strong px-4 text-[13px] font-bold text-primary-foreground hover:opacity-90"
        >
          {copy.accept}
        </button>
        <button
          type="button"
          onClick={() => {
            writeConsent("no");
            setConsent("no");
          }}
          className="inline-flex min-h-9 items-center rounded-xl border border-border bg-card px-4 text-[13px] font-semibold text-foreground hover:border-primary/40"
        >
          {copy.decline}
        </button>
      </div>
    </div>
  );
}
