import { test, expect } from "@playwright/test";
import { GATED_SURFACES, SEAT_TABLE } from "./helpers/surfaces";
import { createVerifiedSession, destroySession, type TestSession } from "./helpers/session";

/**
 * Does the site actually learn anything about the person it just let in?
 *
 * The gate was earning phone numbers and nothing else — four of the first six
 * enquiries reached the counsellors as "Not given" with no rank. The tuner fixes
 * that, and it fails in a way nobody would notice: it renders, the visitor
 * answers, and if the save is broken the page still looks right. Only the
 * enquiry a counsellor picks up an hour later is empty.
 *
 * So this asserts against the API the tuner posts to, and against what a
 * counsellor would see, rather than against the questions being on screen.
 */

test.describe.configure({ mode: "serial" });

let session: TestSession;

test.beforeAll(async ({ baseURL }) => {
  session = await createVerifiedSession(baseURL!);
});

test.afterAll(async () => {
  if (session) await destroySession(session);
});

test.describe("The counselling profile", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      {
        ...session.cookie,
        httpOnly: true,
        secure: session.cookie.domain !== "localhost",
        sameSite: "Lax",
      },
    ]);
  });

  test("an anonymous caller cannot write one", async ({ playwright, baseURL }) => {
    const api = await playwright.request.newContext({ baseURL });
    try {
      const res = await api.post("/api/profile", { data: { rank: "1" } });
      expect(res.status(), "anyone could write to somebody's profile").toBe(401);
    } finally {
      await api.dispose();
    }
  });

  test("each answer is saved on its own, not only at the end", async ({ page }) => {
    await page.goto(GATED_SURFACES[0].path);

    // Somebody who answers two questions and leaves has still told us two
    // things, and those two are what a counsellor opens with.
    const first = await page.request.post("/api/profile", {
      data: { rank: "38951", source: "spec" },
    });
    expect(first.status()).toBe(200);
    const afterOne = await first.json();
    expect(afterOne.profile.rank).toBe(38951);
    expect(afterOne.attachedToLead, "the answer never reached the enquiry").toBeDefined();

    const second = await page.request.post("/api/profile", {
      data: { category: "OBC", source: "spec" },
    });
    const afterTwo = await second.json();

    // The second answer must not wipe the first — every field is COALESCEd over
    // what is already there, so a partial answer adds rather than replaces.
    expect(afterTwo.profile.rank, "answering again blanked an earlier answer").toBe(38951);
    expect(afterTwo.profile.category).toBe("OBC");
    expect(afterTwo.completeness).toBeGreaterThan(afterOne.completeness);
  });

  test("the budget ceiling comes from us, not from the client", async ({ page }) => {
    await page.goto(GATED_SURFACES[0].path);

    // A band id maps to a number on the server. If the client could send the
    // number, it could hand itself a ceiling the seat query would then trust.
    const honest = await page.request.post("/api/profile", {
      data: { budget: "15-40l", source: "spec" },
    });
    expect((await honest.json()).profile.budgetMax).toBe(4_000_000);

    const forged = await page.request.post("/api/profile", {
      data: { budget: "15-40l", budgetMax: 999_999_999, source: "spec" },
    });
    expect(
      (await forged.json()).profile.budgetMax,
      "a client-supplied ceiling was trusted",
    ).toBe(4_000_000);
  });

  test("the profile comes back, so nobody is asked twice", async ({ page }) => {
    await page.goto(GATED_SURFACES[0].path);
    await page.request.post("/api/profile", {
      data: { rank: "38951", category: "OBC", preferredState: "Rajasthan", source: "spec" },
    });

    const res = await page.request.get("/api/profile");
    expect(res.status()).toBe(200);
    const { profile } = await res.json();
    expect(profile.rank).toBe(38951);
    expect(profile.category).toBe("OBC");
    expect(profile.preferredState).toBe("Rajasthan");
  });

  test("the counselling panel is on the page with the seats", async ({ page }) => {
    await page.goto(GATED_SURFACES[0].path);
    await page.waitForLoadState("load");

    // It only earns its place beside a real answer — that is the whole argument
    // it makes, so it must not appear where there is nothing to be counselled on.
    await expect(page.locator(SEAT_TABLE)).not.toHaveCount(0);
    await expect(page.getByRole("button", { name: /talk on whatsapp/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /request a call back/i })).toBeVisible();

    // And it says what the data cannot do, rather than claiming accuracy.
    await expect(page.getByText(/float or freeze/i)).toBeVisible();
  });

  test("the last two fields are asked where they are relevant", async ({ page }) => {
    await page.goto(GATED_SURFACES[0].path);
    await page.waitForLoadState("load");

    await expect(page.getByLabel(/which attempt is this/i)).toBeVisible();
    await expect(page.getByLabel(/where did you do mbbs/i)).toBeVisible();
  });
});
