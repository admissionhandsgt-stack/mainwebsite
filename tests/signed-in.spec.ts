import { test, expect, blockAnalytics } from "./helpers/noAnalytics";
import { GATED_SURFACES, SEAT_TABLE, SEAT_TABLE_HEADING } from "./helpers/surfaces";
import { createVerifiedSession, destroySession, type TestSession } from "./helpers/session";

/**
 * What a verified student gets (2026-10-12): their colleges in chance words —
 * never a closing rank, on any page, signed in or not (lib/depth.ts).
 *
 * The third leg of the gate tests. gate.spec.ts proves an anonymous visitor
 * gets no rows; this proves signing in does not hand them over either, and that
 * it does open what it should: the chance view, and only while the session is
 * live — sessions are rows precisely so that signing out revokes.
 */

test.describe.configure({ mode: "serial" });

let session: TestSession;

test.beforeAll(async ({ baseURL }) => {
  session = await createVerifiedSession(baseURL!);
});

test.afterAll(async () => {
  if (session) await destroySession(session);
});

const RANK_KEYS = /"(firstRoundRank|widestRank|previousYearRank|furthestEver|r1Latest|widestLatest|r1|widest)"\s*:\s*\d/;

test.describe("A verified student", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      { ...session.cookie, httpOnly: true, secure: session.cookie.domain !== "localhost", sameSite: "Lax" },
    ]);
  });

  for (const surface of GATED_SURFACES) {
    test(`${surface.label} still shows no seat table`, async ({ page }) => {
      await page.goto(surface.path);
      await page.waitForLoadState("load");
      await expect(page.locator(SEAT_TABLE)).toHaveCount(0);
      for (const heading of await page.locator("table thead").allInnerTexts()) {
        expect(heading).not.toMatch(SEAT_TABLE_HEADING);
      }
    });
  }

  test("gets colleges in chance words, and no rank", async ({ page }) => {
    await page.goto("/neet-college-predictor");
    const res = await page.request.get("/api/predict?stream=pg&rank=25000&category=GEN");
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.options)).toBe(true);
    expect(json.options.length).toBeGreaterThan(5);
    expect(json.results).toEqual([]);
    expect(JSON.stringify(json)).not.toMatch(RANK_KEYS);
    for (const c of json.options.slice(0, 10)) {
      expect(["safe", "likely", "possible", "stretch"]).toContain(c.best);
      expect(c.slug).toBeTruthy();
    }
  });

  test("the chance finder opens on the questions", async ({ page }) => {
    await page.goto("/neet-college-predictor?course=pg&rank=25000&category=GEN");
    await expect(page.getByText(/Step 1 of/)).toBeVisible({ timeout: 30_000 });
  });
});

test.describe("Signing out closes it again", () => {
  test("a revoked session stops getting colleges", async ({ browser, baseURL }) => {
    const throwaway = await createVerifiedSession(baseURL!);
    const context = await browser.newContext();
    await blockAnalytics(context);
    await context.addCookies([
      { ...throwaway.cookie, httpOnly: true, secure: throwaway.cookie.domain !== "localhost", sameSite: "Lax" },
    ]);
    const page = await context.newPage();
    try {
      await page.goto("/");
      const before = await (await page.request.get("/api/predict?stream=pg&rank=25000&category=GEN")).json();
      expect(Array.isArray(before.options)).toBe(true);

      await destroySession(throwaway);

      const after = await (await page.request.get("/api/predict?stream=pg&rank=25000&category=GEN")).json();
      expect(after.options).toBeNull();
    } finally {
      await context.close();
    }
  });
});
