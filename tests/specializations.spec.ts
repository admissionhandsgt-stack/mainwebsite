import { test, expect } from '@playwright/test';

// The branches we want to visually inspect to ensure the Decision Engine renders correctly
const branchesToTest = [
  'md-general-medicine',
  'md-radiology',
  'ms-general-surgery',
  'md-dermatology'
];

test.describe('Decision Engine Subpage Visual Tests', () => {
  test.setTimeout(120000); // Allow enough time for headed visual inspection

  for (const slug of branchesToTest) {
    test(`Visually inspect ${slug} page from top to bottom`, async ({ page }) => {
      // 1. Navigate to the branch page
      await page.goto(`/specializations/${slug}`);
      
      // 2. Wait for the Hero section to load
      await page.waitForSelector('h1', { state: 'visible' });

      // 3. Slowly scroll down the page to let the user observe the new UI components
      const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
      const viewportHeight = await page.evaluate(() => window.innerHeight);

      for (let i = 0; i < scrollHeight; i += viewportHeight / 2) {
        await page.evaluate(`window.scrollTo(0, ${i})`);
        await page.waitForTimeout(800); // Pause to allow user to read the UI
      }

      // Scroll to bottom
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await page.waitForTimeout(1500);

      // Scroll back up to the Consultant Note (usually around the middle/right column)
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight / 3)');
      await page.waitForTimeout(1500);
      
      // Basic assertions to ensure the data layer didn't break
      // Instead of exact text, ensure key elements exist specifically to avoid strict mode violations:
      await expect(page.locator('h2:has-text("Branch Overview")')).toBeVisible();
      await expect(page.locator('h3:has-text("Key Responsibilities")')).toBeVisible();
      await expect(page.locator('h3:has-text("Demand Trend")')).toBeVisible();
      await expect(page.locator('h3:has-text("Salary Range")')).toBeVisible();
    });
  }
});
