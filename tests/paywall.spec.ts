import { test, expect } from "@playwright/test";
import { GATED_SURFACES, OPEN_SURFACES, LOCKED_SUMMARY } from "./helpers/surfaces";

/**
 * Is the gate declared, and does the declaration point at anything?
 *
 * Serving a verified crawler rows that a visitor does not get is cloaking — a
 * spam violation that can remove the site from the index — unless the page says
 * it is gated, with `isAccessibleForFree: false` and a `hasPart` naming the
 * withheld section's CSS selector.
 *
 * **The second half is why this is a browser test.** A string check can confirm
 * the markup exists; only a browser can confirm the selector it names matches a
 * real element. Rename the class on the gated block and the JSON-LD still reads
 * perfectly while pointing at nothing — and the site is then cloaking, silently,
 * with no error anywhere and no way to notice until traffic goes.
 */

interface JsonLd {
  "@type"?: string;
  isAccessibleForFree?: boolean;
  hasPart?: { "@type"?: string; isAccessibleForFree?: boolean; cssSelector?: string };
}

async function structuredData(page: import("@playwright/test").Page): Promise<JsonLd[]> {
  const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
  return blocks.flatMap((raw) => {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // A block that does not parse is its own failure; surfaced by the
      // assertion below rather than swallowed here.
      return [{ __unparseable: raw.slice(0, 120) } as unknown as JsonLd];
    }
  });
}

test.describe("Paywalled-content markup", () => {
  for (const surface of GATED_SURFACES) {
    test(`${surface.label} declares the gate, and the selector resolves`, async ({ page }) => {
      await page.goto(surface.path);
      await page.waitForLoadState("load");

      const all = await structuredData(page);
      expect(
        all.some((b) => "__unparseable" in (b as object)),
        "a JSON-LD block did not parse",
      ).toBe(false);

      const declaration = all.find((b) => b.hasPart?.isAccessibleForFree === false);
      expect(declaration, "no paywall declaration on a page that gates rows").toBeTruthy();

      const selector = declaration!.hasPart!.cssSelector;
      expect(selector, "hasPart must name the withheld section").toBeTruthy();

      // The assertion that only a browser can make.
      await expect(
        page.locator(selector!),
        `the declared selector "${selector}" matches nothing on the page`,
      ).not.toHaveCount(0);

      // And it must be the gated block, not some unrelated element that happens
      // to carry the class.
      const declared = page.locator(selector!).first();
      await expect(declared).toBeVisible();
    });
  }

  test("the declared selector is the element the gate actually renders", async ({ page }) => {
    await page.goto(GATED_SURFACES[0].path);
    await page.waitForLoadState("load");

    const [declaration] = (await structuredData(page)).filter(
      (b) => b.hasPart?.isAccessibleForFree === false,
    );
    const selector = declaration.hasPart!.cssSelector!;

    // The locked summary is inside the declared region — so what Google is told
    // is withheld is the thing that is withheld.
    const summaryInsideDeclared = page.locator(`${selector}${LOCKED_SUMMARY}, ${selector} ${LOCKED_SUMMARY}`);
    await expect(summaryInsideDeclared).toHaveCount(1);
  });

  test("the page itself is not marked paid", async ({ page }) => {
    await page.goto(GATED_SURFACES[0].path);
    await page.waitForLoadState("load");

    const declaration = (await structuredData(page)).find(
      (b) => b.hasPart?.isAccessibleForFree === false,
    )!;
    // Only the part is withheld. Saying the whole page is paid would be wrong —
    // most of it is free, and it is what ranks.
    expect(declaration.isAccessibleForFree).toBe(true);
  });
});

test.describe("Open pages", () => {
  for (const surface of OPEN_SURFACES) {
    test(`${surface.label} claims no paywall`, async ({ page }) => {
      await page.goto(surface.path);
      await page.waitForLoadState("load");

      const declared = (await structuredData(page)).some(
        (b) => b.hasPart?.isAccessibleForFree === false,
      );
      // Declaring a gate that is not there would tell Google to expect content
      // it can see, which is the opposite mistake but still a false statement.
      expect(declared, "an open page declares a paywall it does not have").toBe(false);
    });
  }
});
