import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false, // Run tests sequentially to avoid local race conditions
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1, // Use a single worker locally for stable DB interactions
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3005',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npx next dev -p 3005',
    url: 'http://localhost:3005',
    reuseExistingServer: true,
    timeout: 120000, // 2 minutes
  },
});
