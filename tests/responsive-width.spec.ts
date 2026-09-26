import { test, expect } from "@playwright/test";

/**
 * Does the page use the display it is given?
 *
 * The site used to stop at 1400px however wide the screen was, because
 * Tailwind's ladder ends at 1536px — on a 2560px monitor a third of the glass was
 * empty margin. `--page-max` steps past that, and this checks the ladder holds at
 * each step and that nothing overflows sideways at any of them.
 *
 * It is a browser test because that is the only place a CSS custom property has a
 * value. Reading `layout.css` would only confirm what was written, not what the
 * cascade resolved to after every media query and container rule had its say.
 *
 * Runs in the desktop project only for the wide steps — an iPhone viewport cannot
 * be 2560px — but the mobile project still runs the overflow checks, which are
 * the ones that catch a phone-width regression.
 */

interface Step {
  width: number;
  /** What --page-max should resolve to. `null` means "100%", i.e. below sm. */
  expected: string | null;
}

/** The ladder as `src/styles/layout.css` defines it. */
const LADDER: Step[] = [
  { width: 390, expected: "100%" },
  { width: 640, expected: "640px" },
  { width: 768, expected: "768px" },
  { width: 1024, expected: "1024px" },
  { width: 1280, expected: "1280px" },
  { width: 1440, expected: "1280px" }, // still the 1280 step until 1536
  { width: 1536, expected: "1440px" },
  { width: 1800, expected: "1640px" },
  { width: 2100, expected: "1840px" },
  { width: 2560, expected: "2040px" },
  { width: 3440, expected: "2040px" }, // capped: prose 3000px wide is unreadable
];

const PAGES = ["/", "/md-ms-india/branches/md-general-medicine", "/neet-college-predictor"];

async function measure(page: import("@playwright/test").Page) {
  return page.evaluate(() => {
    const px = (el: Element | null) => (el ? Math.round(el.getBoundingClientRect().width) : null);
    return {
      pageMax: getComputedStyle(document.documentElement).getPropertyValue("--page-max").trim(),
      container: px(document.querySelector(".container, .container-custom")),
      overflow: Math.max(0, document.documentElement.scrollWidth - window.innerWidth),
    };
  });
}

test.describe("The width ladder", () => {
  test("--page-max steps up with the viewport", async ({ page, isMobile }) => {
    test.skip(isMobile, "a phone viewport cannot be resized to 3440px");

    await page.goto("/");
    await page.waitForLoadState("load");

    for (const step of LADDER) {
      await page.setViewportSize({ width: step.width, height: 900 });
      // Give the media queries a frame to apply.
      await page.waitForTimeout(150);

      const { pageMax, container } = await measure(page);
      expect(pageMax, `--page-max at ${step.width}px`).toBe(step.expected);

      if (step.expected !== "100%") {
        const target = Number(step.expected!.replace("px", ""));
        // The container tracks the variable, minus nothing — gutters are padding.
        expect(container, `container width at ${step.width}px`).toBe(target);
      } else {
        expect(container, `container should fill a narrow viewport`).toBe(step.width);
      }
    }
  });

  test("the cap is deliberate, not an accident", async ({ page, isMobile }) => {
    test.skip(isMobile, "desktop-only check");
    await page.goto("/");
    await page.waitForLoadState("load");

    await page.setViewportSize({ width: 5000, height: 900 });
    await page.waitForTimeout(150);
    const { pageMax } = await measure(page);
    // If this ever grows, somebody added a step above 2500px without deciding
    // whether a line that wide is still readable.
    expect(pageMax).toBe("2040px");
  });
});

test.describe("Nothing overflows sideways", () => {
  for (const path of PAGES) {
    test(`${path} has no horizontal scroll`, async ({ page, isMobile }) => {
      const widths = isMobile ? [null] : [390, 768, 1280, 1920, 2560];

      await page.goto(path);
      await page.waitForLoadState("load");

      for (const width of widths) {
        if (width) {
          await page.setViewportSize({ width, height: 900 });
          await page.waitForTimeout(200);
        }
        const { overflow } = await measure(page);
        expect(overflow, `${path} overflows by ${overflow}px at ${width ?? "device"} width`).toBe(0);
      }
    });
  }
});
