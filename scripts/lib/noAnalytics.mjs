// Scripts that drive a real browser against production never send analytics (2026-10-17).
// Before this, every audit or screenshot run was counted by GA4 and AutoLoom as a visitor.
// The same rule as tests/helpers/noAnalytics.ts: refuse every request to the three hosts.

export const ANALYTICS_URL = /^https?:\/\/(?:[^/]*\.)?(?:google-analytics\.com|googletagmanager\.com|analytics\.theautoloom\.in)(?:[/:?#]|$)/;

/** Call on a Playwright BrowserContext (or Page) right after creating it. */
export async function blockAnalytics(contextOrPage) {
  await contextOrPage.route(ANALYTICS_URL, (route) => route.abort("blockedbyclient"));
}

/**
 * Lighthouse (perf_lab.mjs) measures how a page loads, scripts included, so the
 * scripts still load — only the hits that would record a visit are blocked:
 * our GA4 property's collect calls and AutoLoom's ingest endpoints.
 */
export const LIGHTHOUSE_BLOCKED = ["*google-analytics.com/g/collect*tid=G-SCQ3V4NFLS*", "*googletagmanager.com/g/collect*tid=G-SCQ3V4NFLS*", "*analytics.theautoloom.in/v1/*"];
