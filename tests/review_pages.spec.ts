import { test, expect } from '@playwright/test';

test('Take screenshots of services and neet process pages', async ({ page }) => {
  await page.goto('/services');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'tests/services-page.png', fullPage: true });

  await page.goto('/neet-ug-process');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'tests/neet-ug-process-page.png', fullPage: true });
});
