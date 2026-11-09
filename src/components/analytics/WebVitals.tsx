"use client";

import { useReportWebVitals } from "next/web-vitals";
import { trackEvent } from "@/lib/analytics";

/**
 * Real users' Core Web Vitals to GA4 (2026-11-09: "Measure real users — lab scores lie"). Lighthouse and PSI are a
 * simulated phone; this is what visitors' own phones and networks measured, page by page. One `web_vitals` event per
 * metric per page view: LCP, INP and CLS (the three Google ranks on) and TTFB (the server and edge). Nothing personal
 * — the metric, its value, Google's own rating and the page. CLS is sent ×1000 so it is a whole number like the rest.
 * Mounted in SiteShell, so the admin is never measured. GA4: event `web_vitals`, dimensions metric and
 * metric_rating, metric metric_value.
 */
const KEEP = new Set(["LCP", "INP", "CLS", "TTFB"]);

export default function WebVitals() {
  useReportWebVitals((m) => {
    if (!KEEP.has(m.name)) return;
    trackEvent("web_vitals", {
      metric: m.name, // not "metric_name": lib/analytics drops any key containing "name"
      metric_value: Math.round(m.name === "CLS" ? m.value * 1000 : m.value),
      metric_rating: m.rating,
      source_page: window.location.pathname,
      non_interaction: true,
    });
  });
  return null;
}
