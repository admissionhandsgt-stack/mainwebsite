import { test, expect } from "@playwright/test";
import { GATED_SURFACES, SEAT_TABLE, LOCKED_SUMMARY } from "./helpers/surfaces";
import { createVerifiedSession, destroySession, type TestSession } from "./helpers/session";

/**
 * Does the gate open?
 *
 * Every other spec here proves it holds. None of them would notice if it had
 * stopped opening — a gate that never opens passes "no rows reached an anonymous
 * visitor" perfectly, and is an outage.
 *
 * Serialised, and it cleans up in `afterAll` even on failure, because it writes
 * a real session row to the live database.
 */

test.describe.configure({ mode: "serial" });

let session: TestSession;

test.beforeAll(async ({ baseURL }) => {
  session = await createVerifiedSession(baseURL!);
});

test.afterAll(async () => {
  if (session) await destroySession(session);
});

test.describe("A verified visitor", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      { ...session.cookie, httpOnly: true, secure: session.cookie.domain !== "localhost", sameSite: "Lax" },
    ]);
  });

  for (const surface of GATED_SURFACES) {
    test(`${surface.label} shows the real table`, async ({ page }) => {
      await page.goto(surface.path);
      await page.waitForLoadState("load");

      await expect(page.locator(SEAT_TABLE)).toHaveCount(surface.blocks);
      // And the panel that stood in for it is gone, rather than both showing.
      await expect(page.locator(LOCKED_SUMMARY)).toHaveCount(0);

      const rows = page.locator(`${SEAT_TABLE} tbody tr`);
      const count = await rows.count();
      expect(count, `${surface.path} rendered an empty table`).toBeGreaterThan(5);

      // A row has to describe a seat, which means every cell filled and a
      // number in it. `(institute, course, quota, category)` is what identifies
      // a seat, so a blank cell is a row that describes nothing — the failure
      // mode behind the misleading branch table of 2026-09-25.
      const first = rows.first();
      const cells = await first.locator("td").allInnerTexts();
      expect(cells.length, "a seat row needs at least four columns").toBeGreaterThanOrEqual(4);
      expect(
        cells.filter((c) => c.trim().length === 0),
        "a blank cell means the row describes no real seat",
      ).toEqual([]);
      await expect(first).toContainText(/\d/);
    });
  }

  test("branch-table rows link to the college they belong to", async ({ page }) => {
    // The listing that exists to reach the per-college pages once rendered every
    // name as plain text, because a memo dropped `slug` — and all ~840 of those
    // pages were unreachable from it. Cheap to guard, expensive to miss.
    await page.goto(GATED_SURFACES[0].path);
    await page.waitForLoadState("load");

    const rows = page.locator(`${SEAT_TABLE} tbody tr`);
    const sample = Math.min(await rows.count(), 15);
    for (let i = 0; i < sample; i++) {
      await expect(
        rows.nth(i).locator('a[href*="/colleges/"]'),
        `row ${i + 1} names no college page`,
      ).toHaveCount(1);
    }
  });

  test("the rows go far beyond what the old preview published", async ({ page }) => {
    // The branch pages used to ship 40. If this ever drops back to about that,
    // something has reintroduced a slice.
    await page.goto(GATED_SURFACES[0].path);
    await page.waitForLoadState("load");
    const rows = await page.locator(`${SEAT_TABLE} tbody tr`).count();
    expect(rows).toBeGreaterThan(40);
  });

  test("the depth APIs answer", async ({ page }) => {
    await page.goto(GATED_SURFACES[0].path);
    const res = await page.request.get(
      "/api/seat-rows?kind=branch&slug=md-general-medicine&category=GEN",
    );
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.rows)).toBe(true);
    expect(json.rows.length).toBeGreaterThan(40);

    // One row, one seat: the fee on a row belongs to the quota on that row.
    for (const row of json.rows.slice(0, 20)) {
      expect(row.quota, "a row without a quota cannot describe a seat").toBeTruthy();
      expect(row.college).toBeTruthy();
    }
  });
});

test.describe("Signing out closes it again", () => {
  test("a revoked session stops working", async ({ browser, baseURL }) => {
    // Sessions are rows, not signed tokens, precisely so that signing out can
    // revoke rather than merely stop presenting. Worth asserting, because a
    // token-based shortcut would pass every other test in this file.
    const throwaway = await createVerifiedSession(baseURL!);
    const context = await browser.newContext();
    await context.addCookies([
      { ...throwaway.cookie, httpOnly: true, secure: throwaway.cookie.domain !== "localhost", sameSite: "Lax" },
    ]);
    const page = await context.newPage();
    try {
      await page.goto(GATED_SURFACES[0].path);
      await page.waitForLoadState("load");
      await expect(page.locator(SEAT_TABLE)).toHaveCount(1);

      await destroySession(throwaway);

      await page.goto(GATED_SURFACES[0].path);
      await page.waitForLoadState("load");
      await expect(page.locator(SEAT_TABLE)).toHaveCount(0);
      await expect(page.locator(LOCKED_SUMMARY)).toHaveCount(1);
    } finally {
      await context.close();
    }
  });
});
