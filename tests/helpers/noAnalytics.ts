import { test as base, expect, type BrowserContext } from "@playwright/test";

/**
 * Test runs never send analytics (2026-10-17). These specs run against
 * production, and before this every run landed in GA4 and AutoLoom as a real
 * visitor — 253 "sessions" of 2 seconds on /md-ms-india/branches/md-general-medicine
 * in one month, and most of the "Direct" channel. Every request to the three
 * analytics hosts is refused in the browser, before it leaves the machine.
 *
 * Specs import `test` and `expect` from here instead of "@playwright/test"; a
 * spec that opens its own context with `browser.newContext()` calls
 * `blockAnalytics(context)` on it.
 */
export const ANALYTICS_URL = /^https?:\/\/(?:[^/]*\.)?(?:google-analytics\.com|googletagmanager\.com|analytics\.theautoloom\.in)(?:[/:?#]|$)/;

export async function blockAnalytics(context: BrowserContext) {
  await context.route(ANALYTICS_URL, (route) => route.abort("blockedbyclient"));
}

export const test = base.extend<{ noAnalytics: void }>({
  noAnalytics: [
    async ({ context }, use) => {
      await blockAnalytics(context);
      await use();
    },
    { auto: true },
  ],
});

export { expect };
