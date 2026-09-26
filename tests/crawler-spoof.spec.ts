import { test, expect } from "@playwright/test";
import {
  GATED_SURFACES,
  SEAT_TABLE,
  SEAT_TABLE_HEADING,
  LOCKED_SUMMARY,
  SPOOFED_CRAWLERS,
} from "./helpers/surfaces";

/**
 * Can somebody get the seat data by saying they are Googlebot?
 *
 * A verified crawler is served the whole table, which is what keeps ~3,700 pages
 * ranking. Everything therefore rests on "verified" meaning something, and a
 * user-agent means nothing at all — `curl -A Googlebot` is one flag.
 *
 * The forged-`X-Forwarded-For` case here is not theoretical. It is the hole the
 * first run of this check found on 2026-09-26: Caddy *appends* the peer address
 * rather than replacing it, so a request carrying
 * `X-Forwarded-For: 66.249.66.1` arrived as `66.249.66.1, <real address>` and
 * the app read the left-most hop. Two changes closed it — Caddy now replaces the
 * header, and the app reads the right-most hop — and this spec exists so the
 * next person to touch either finds out immediately.
 */

test.describe("A spoofed crawler gets nothing", () => {
  for (const crawler of SPOOFED_CRAWLERS) {
    test.describe(crawler.name, () => {
      test.use({ userAgent: crawler.userAgent });

      test("the user-agent alone opens nothing", async ({ page }) => {
        await page.goto(GATED_SURFACES[0].path);
        await page.waitForLoadState("load");

        await expect(page.locator(SEAT_TABLE)).toHaveCount(0);
        await expect(page.locator(LOCKED_SUMMARY)).toHaveCount(GATED_SURFACES[0].blocks);
        for (const heading of await page.locator("table thead").allInnerTexts()) {
          expect(heading).not.toMatch(SEAT_TABLE_HEADING);
        }
      });

      test("nor does it with a forged forwarded address", async ({ browser }) => {
        const context = await browser.newContext({
          userAgent: crawler.userAgent,
          extraHTTPHeaders: { "X-Forwarded-For": crawler.forwarded },
        });
        const page = await context.newPage();
        try {
          for (const surface of GATED_SURFACES.slice(0, 3)) {
            await page.goto(surface.path);
            await page.waitForLoadState("load");
            await expect(
              page.locator(SEAT_TABLE),
              `${surface.path} served rows to a forged ${crawler.name}`,
            ).toHaveCount(0);
            for (const heading of await page.locator("table thead").allInnerTexts()) {
              expect(
                heading,
                `${surface.path} printed seat-table headers to a forged ${crawler.name}`,
              ).not.toMatch(SEAT_TABLE_HEADING);
            }
          }
        } finally {
          await context.close();
        }
      });

      test("nor through the depth APIs", async ({ playwright }) => {
        const api = await playwright.request.newContext({
          baseURL: test.info().project.use.baseURL,
          extraHTTPHeaders: {
            "User-Agent": crawler.userAgent,
            "X-Forwarded-For": crawler.forwarded,
          },
        });
        try {
          for (const path of [
            "/api/seat-rows?kind=branch&slug=md-general-medicine&category=GEN",
            "/api/college-cutoffs?slug=sms-medical-college-jaipur&level=pg",
          ]) {
            const res = await api.get(path);
            expect(res.status(), `${path} answered a forged ${crawler.name}`).toBe(401);
          }
        } finally {
          await api.dispose();
        }
      });
    });
  }

  test("a forwarded chain does not help either", async ({ browser }) => {
    // Several hops, all of them Google's, with the real address appended last.
    const context = await browser.newContext({
      userAgent: SPOOFED_CRAWLERS[0].userAgent,
      extraHTTPHeaders: {
        "X-Forwarded-For": "66.249.66.1, 66.249.64.2, 66.249.79.3",
        "X-Real-IP": "66.249.66.1",
      },
    });
    const page = await context.newPage();
    try {
      await page.goto(GATED_SURFACES[0].path);
      await page.waitForLoadState("load");
      await expect(page.locator(SEAT_TABLE)).toHaveCount(0);
      for (const heading of await page.locator("table thead").allInnerTexts()) {
        expect(heading).not.toMatch(SEAT_TABLE_HEADING);
      }
    } finally {
      await context.close();
    }
  });
});
