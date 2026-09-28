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
 * because a suite that mostly fails tells you nothing. To go through them:
 *
 *   LEGACY=1 npx playwright test --project=legacy
 *
 * The exclusion is per project rather than a global `testIgnore`, because a
 * global one also hid them from the project whose only purpose is to run them —
 * an escape hatch that silently did nothing.
 */

const baseURL = process.env.BASE_URL ?? "https://www.admissionhands.com";
const isLocalDev = /localhost:3000/.test(baseURL);

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  /**
   * Retry once against a remote target.
   *
   * Not a shrug at flaky tests. Two full runs failed five tests between them and
   * none reproduced alone, so the server was measured directly: 35 ms warm, and
   * 120–254 ms under eight concurrent requests at a load average of 0.17 on
   * eight cores. The application is not the problem — the long-haul link from a
   * dev machine to the VPS is, and a retry is the honest way to test over one.
   * A test that fails twice is still a failure.
   */
  retries: process.env.CI ? 2 : isLocalDev ? 0 : 1,
  /**
   * Two against a remote target, four locally.
   *
   * Every data page renders per request now, so four browsers loading heavy
   * pages over the internet contend for one Node process. Two consecutive full
   * runs failed three *different* tests, none of which reproduced on its own —
   * that is load, not a bug, and a suite that cries wolf gets ignored.
   */
  workers: process.env.CI ? 1 : isLocalDev ? 4 : 2,
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
      // Per project, not globally: a global `testIgnore` would also hide these
      // from the `legacy` project below, whose only purpose is to run them.
      testIgnore: "**/legacy/**",
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
      testIgnore: "**/legacy/**",
    },
    {
      // And iOS Safari, which renders enough differently to be worth its own run.
      // Needs `npx playwright install webkit`.
      name: "ios",
      use: { ...devices["iPhone 14"] },
      testMatch: /(gate|responsive-width)\.spec\.ts/,
      testIgnore: "**/legacy/**",
    },
    // Only when asked for. A project listed unconditionally is part of the
    // default run, which would put the specs this suite replaced back into it.
    ...(process.env.LEGACY
      ? [
          {
            name: "legacy" as const,
            testDir: "./tests/legacy",
            use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1100 } },
          },
        ]
      : []),
  ],
  webServer: isLocalDev
    ? { command: "npm run dev", url: baseURL, reuseExistingServer: true, timeout: 120_000 }
    : undefined,
});
