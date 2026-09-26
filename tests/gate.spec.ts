import { test, expect, type Page } from "@playwright/test";
import {
  GATED_SURFACES,
  OPEN_SURFACES,
  SEAT_TABLE,
  SEAT_TABLE_HEADING,
  LOCKED_SUMMARY,
} from "./helpers/surfaces";

/**
 * Does any seat-level detail reach a visitor who has not signed in?
 *
 * `scripts/verify_gate.mjs` asks this of the HTML. This asks it of a **browser**,
 * which is the version that matters: the HTML could be clean while a client
 * component fetches the rows on mount and renders them a moment later. That is
 * not a hypothetical — it is exactly what `CollegeCutoffs` used to do, and the
 * whole table arrived after hydration. curl would have called that page gated.
 *
 * So every assertion here runs after the network has gone quiet, and the table is
 * checked two ways: by `data-testid`, which says precisely which element, and by
 * its column headers, because a "count 0" on an attribute is vacuously true the
 * moment somebody drops the attribute. `signed-in.spec.ts` is the third leg —
 * it asserts the hook *does* match when the gate opens, so the hook cannot
 * quietly disappear.
 */

/**
 * Console noise that is about the test run, not the page.
 *
 * Resource failures under parallel load against a live site — chased once as an
 * iOS-only bug before the same test passed on its own.
 */
const NETWORK_NOISE =
  /(Failed to load resource|net::ERR_|Load failed|ERR_NETWORK|status of 4\d\d|status of 5\d\d)/i;

/** Wait for hydration and any on-mount fetch to finish. */
async function settle(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("load");
  // `networkidle` never settles here — the marquee and the analytics beacon keep
  // it busy, which once made this harness report 22 working pages as broken.
  // A fixed beat after `load` is what that cost us.
  await page.waitForTimeout(1500);
}

test.describe("Anonymous visitor", () => {
  for (const surface of GATED_SURFACES) {
    test(`${surface.label} shows the summary and no seat rows`, async ({ page }) => {
      // An uncaught exception is always the page's fault. A console error very
      // often is not: run three browser projects at four workers each against a
      // live site and you will collect "Failed to load resource" from your own
      // load, which fails the run and tells you nothing. Both are recorded, only
      // one of them fails, and the noisy one is filtered rather than trusted.
      const pageErrors: string[] = [];
      const consoleErrors: string[] = [];
      page.on("pageerror", (e) => pageErrors.push(e.message));
      page.on("console", (m) => {
        if (m.type() !== "error") return;
        const text = m.text();
        if (NETWORK_NOISE.test(text)) return;
        consoleErrors.push(text);
      });

      const response = await page.goto(surface.path);
      expect(response?.status(), `${surface.path} should answer 200`).toBe(200);
      await settle(page);

      // The point of the whole exercise, checked two independent ways: the test
      // hook says which element, and the column headers say the table is not
      // there under any other guise. The attribute alone would pass vacuously if
      // somebody dropped the hook.
      await expect(
        page.locator(SEAT_TABLE),
        "a seat row reached an anonymous visitor",
      ).toHaveCount(0);

      // No table anywhere on the page carries the seat table's own heading.
      for (const heading of await page.locator("table thead").allInnerTexts()) {
        expect(heading, "a table with seat-table headers rendered").not.toMatch(
          SEAT_TABLE_HEADING,
        );
      }

      // And the page is not simply empty where the table was.
      await expect(page.locator(LOCKED_SUMMARY)).toHaveCount(surface.blocks);
      await expect(page.locator(LOCKED_SUMMARY).first()).toContainText("By quota");

      // The summary has to be worth reading, or the gate converts nobody.
      const quotaRows = page.locator(`${LOCKED_SUMMARY} tbody tr`);
      expect(await quotaRows.count()).toBeGreaterThan(0);

      expect(pageErrors, `uncaught exception on ${surface.path}`).toEqual([]);
      expect(consoleErrors, `console errors on ${surface.path}`).toEqual([]);
    });
  }

  test("no page leaks a rank through a stray fetch", async ({ page }) => {
    // Anything the browser asks for is recorded; the depth endpoints must all
    // refuse. A 200 from one of these means the page found a way in.
    const depthCalls: { url: string; status: number }[] = [];
    page.on("response", async (res) => {
      const url = res.url();
      if (/\/api\/(seat-rows|college-cutoffs|predict|rounds)/.test(url)) {
        depthCalls.push({ url, status: res.status() });
      }
    });

    for (const surface of GATED_SURFACES.slice(0, 3)) {
      await page.goto(surface.path);
      await settle(page);
    }

    const served = depthCalls.filter((c) => c.status === 200);
    expect(
      served.map((c) => `${c.status} ${c.url}`),
      "a depth endpoint answered 200 to an anonymous browser",
    ).toEqual([]);
  });
});

test.describe("The locked panel offers a way in", () => {
  test("the call to action opens the sign-in dialog", async ({ page }) => {
    await page.goto(GATED_SURFACES[0].path);
    await settle(page);

    const cta = page.locator(LOCKED_SUMMARY).getByRole("button", { name: /show me all/i });
    await expect(cta).toBeVisible();

    await cta.click();

    // A dialog, and one that asks for the phone number rather than a password —
    // the first visit has no password to ask for.
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('input[type="tel"], input[name*="phone" i]').first()).toBeVisible();
  });

  test("the offer names a real number of rows", async ({ page }) => {
    await page.goto(GATED_SURFACES[0].path);
    await settle(page);

    const heading = await page.locator(LOCKED_SUMMARY).innerText();
    // "1,234 seats — college, quota, rank and fee on every row"
    const match = heading.match(/([\d,]+)\s+seats/);
    expect(match, "the panel should say how many rows are behind it").not.toBeNull();
    expect(Number(match![1].replace(/,/g, ""))).toBeGreaterThan(0);
  });
});

test.describe("Pages that are open stay open", () => {
  for (const surface of OPEN_SURFACES) {
    test(`${surface.label} needs no sign-in`, async ({ page }) => {
      const response = await page.goto(surface.path);
      expect(response?.status()).toBe(200);
      await settle(page);

      // These carry no seat rows to gate, so neither component should appear.
      await expect(page.locator(SEAT_TABLE)).toHaveCount(0);
      await expect(page.locator(LOCKED_SUMMARY)).toHaveCount(0);

      // And they must still list colleges, or the hook into the funnel is gone.
      const links = page.locator('a[href*="/colleges/"], a[href*="/branches/"]');
      expect(await links.count(), `${surface.path} lists nothing`).toBeGreaterThan(5);
    });
  }
});
