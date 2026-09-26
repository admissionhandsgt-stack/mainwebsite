import { defineConfig, devices } from "@playwright/test";

/**
 * Two things this config has to get right.
 *
 * **Where it points.** These specs check the seat gate, and a gate is only
 * meaningful against a real deployment: the crawler check reads the forwarded
 * address, which only Caddy sets, and `next dev` does not gate the same way a
 * production build does. So `BASE_URL` decides, and it defaults to production —
 * the thing whose behaviour actually matters. A dev server is started only when
 * the target *is* the dev server.
 *
 *   npx playwright test                                   # production
 *   BASE_URL=http://localhost:8120 npx playwright test    # the box, via the tunnel
 *   BASE_URL=http://localhost:3000 npx playwright test    # local dev, started for you
 *
 * **What it does not run.** The specs under `tests/legacy/` were written in May
 * against a site that has since been largely rebuilt — the predictors merged
 * into one tool, the cutoff explorers removed, the whole gate added. They are
 * kept because several of their checks are still worth salvaging, and excluded
 * because a suite that mostly fails tells you nothing. Run them deliberately
 * with `--project=legacy` if you are going through them.
 */

const baseURL = process.env.BASE_URL ?? "https://www.admissionhands.com";
const isLocalDev = /localhost:3000/.test(baseURL);

export default defineConfig({
  testDir: "./tests",
  testIgnore: "**/legacy/**",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Against production these are read-only page loads, but the signed-in spec
  // writes a session row — so it is serialised by its own describe.serial.
  workers: process.env.CI ? 1 : 4,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    headless: true,
    // The box is reached over an SSH tunnel in one of the three modes above,
    // and a cold dynamic render is tens of milliseconds but the tunnel is not.
    navigationTimeout: 45_000,
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1100 } },
    },
    {
      // Android Chrome first, because that is what most of this audience holds —
      // students mid-counselling, often on a borrowed phone.
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      // The gate and the paywall declaration are decided on the server and are
      // identical everywhere; only layout and the dialog can differ by device,
      // so the phone projects run those specs rather than all of them twice.
      testMatch: /(gate|responsive-width)\.spec\.ts/,
    },
    {
      // And iOS Safari, which renders enough differently to be worth its own run.
      // Needs `npx playwright install webkit`.
      name: "ios",
      use: { ...devices["iPhone 14"] },
      testMatch: /(gate|responsive-width)\.spec\.ts/,
    },
    {
      name: "legacy",
      testDir: "./tests/legacy",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1100 } },
    },
  ],
  webServer: isLocalDev
    ? { command: "npm run dev", url: baseURL, reuseExistingServer: true, timeout: 120_000 }
    : undefined,
});
