"use client";

import { useEffect } from "react";
import { aaTrack, trackEvent } from "@/lib/analytics";
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
 * Only the page the click happened on is sent — never the number dialled or messaged.
 * Mounted in SiteShell, so the admin is never counted.
 */
export default function ClickTracker() {
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const raw = a.getAttribute("href") ?? "";
      const source_page = window.location.pathname;
      if (/^tel:/i.test(raw)) return aaTrack("call_click", { source_page });
      if (/^whatsapp:/i.test(raw)) return aaTrack("whatsapp_click", { source_page });
      let url: URL;
      try {
        url = new URL(raw, window.location.href);
      } catch {
        return;
      }
      const host = url.hostname.toLowerCase();
      if (host === "ah.aismartscan.in") return aaTrack("counsellor_chat_opened", { source_page });
      if (host === "t.me" || host === "telegram.me") {
        const placement = a.dataset.placement || "other";
        // Somebody who has gone to the channel is not invited to it again.
        rememberNudge("telegram");
        aaTrack("telegram_click", { placement, source_page });
        return trackEvent("telegram_click", { placement, source_page });
      }
      if (host === "wa.me" || host.endsWith("whatsapp.com") || (host === window.location.hostname && url.pathname.startsWith("/chat/"))) {
        return aaTrack("whatsapp_click", { source_page });
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
