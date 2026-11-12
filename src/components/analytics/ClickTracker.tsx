"use client";

import { useEffect } from "react";
import { aaTrack, trackEvent, metaTrack } from "@/lib/analytics";
import { rememberNudge } from "@/components/engage/EngagementLayer";

/**
 * AutoLoom click events for the whole public site, from one listener rather
 * than an onClick on every button that happens to be a link:
 *
 *   whatsapp_click           wa.me, api.whatsapp.com, whatsapp:, and our /chat/<counsellor> redirect
 *   call_click               tel:
 *   counsellor_chat_opened   anything on ah.aismartscan.in
 *   pdf_download             a link to a .pdf
 *   telegram_click           t.me / telegram.me — to GA4 as well, with the link's data-placement
 *
 * whatsapp_click and call_click go to GA4 too (2026-11-09): content pages convert through WhatsApp taps and calls,
 * which the leads table never sees, so both are GA4 key events. `placement` is the link's data-placement or "other".
 *
 * Only the page the click happened on is sent — never the number dialled or messaged.
 * Mounted in SiteShell, so the admin is never counted.
 *
 * Every WhatsApp, call and Telegram tap is also counted on our own side (POST /api/tap → `cta_taps`, Admin → Taps by
 * page, 2026-11-11): the page path without its query string, the kind and the placement — nothing else.
 */
const tap = (kind: "whatsapp" | "call" | "telegram", placement: string) => {
  try {
    const body = JSON.stringify({ kind, placement, path: window.location.pathname });
    if (!navigator.sendBeacon?.("/api/tap", new Blob([body], { type: "text/plain" }))) {
      void fetch("/api/tap", { method: "POST", body, keepalive: true, headers: { "content-type": "text/plain" } }).catch(() => {});
    }
  } catch {
    /* a lost count is fine */
  }
};
export default function ClickTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const raw = a.getAttribute("href") ?? "";
      const source_page = window.location.pathname;
      const placement = a.dataset.placement || "other";
      const both = (name: string) => {
        tap(name === "call_click" ? "call" : "whatsapp", placement);
        aaTrack(name, { source_page });
        trackEvent(name, { placement, source_page });
        metaTrack("Contact", { content_category: name === "call_click" ? "call" : "whatsapp", content_name: placement });
      };
      if (/^tel:/i.test(raw)) return both("call_click");
      if (/^whatsapp:/i.test(raw)) return both("whatsapp_click");
      let url: URL;
      try {
        url = new URL(raw, window.location.href);
      } catch {
        return;
      }
      const host = url.hostname.toLowerCase();
      if (host === "ah.aismartscan.in") return aaTrack("counsellor_chat_opened", { source_page });
      if (host === "t.me" || host === "telegram.me") {
        // Somebody who has gone to the channel is not invited to it again.
        rememberNudge("telegram");
        tap("telegram", placement);
        aaTrack("telegram_click", { placement, source_page });
        return trackEvent("telegram_click", { placement, source_page });
      }
      // Google "Preferred Sources" button (footer, "Reviewed by" line): how many readers go to pick us.
      if (host === "www.google.com" && url.pathname === "/preferences/source") {
        aaTrack("preferred_source_click", { placement, source_page });
        return trackEvent("preferred_source_click", { placement, source_page });
      }
      if (host === "wa.me" || host.endsWith("whatsapp.com") || (host === window.location.hostname && url.pathname.startsWith("/chat/"))) {
        return both("whatsapp_click");
      }
      if (/\.pdf$/i.test(url.pathname)) {
        return aaTrack("pdf_download", { file: decodeURIComponent(url.pathname.split("/").pop() ?? "").slice(0, 120), source_page });
      }
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);
  return null;
}
