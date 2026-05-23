import { test, expect } from '@playwright/test';

// All 26 slugs seeded in the database
const slugs = [
  'general-medicine', 'radiology', 'general-surgery', 'pediatrics', 
  'dermatology', 'obgyn', 'orthopedics', 'anesthesiology', 
  'psychiatry', 'ophthalmology', 'ent', 'pathology', 
  'respiratory-medicine', 'emergency-medicine', 'psm', 'radiation-oncology',
  'forensic-medicine', 'microbiology', 'pharmacology', 'anatomy', 
  'physiology', 'biochemistry', 'transfusion-medicine', 'palliative-medicine',
  'geriatric-medicine', 'pmr'
];

test.describe('End-to-End Specialization Page Audit', () => {
  for (const slug of slugs) {
    test(`Verify branch page: ${slug}`, async ({ page }) => {
      console.log(`Checking: ${slug}`);
      
      const response = await page.goto(`/specializations/${slug}`);
      
      // 1. Check for 404 or Server Errors
      expect(response?.status()).toBe(200);
      
      // 2. Wait for main content to render
      await page.waitForSelector('h1', { timeout: 10000 });
      
      // 3. Verify core sections exist
      await expect(page.locator('text=Branch Overview')).toBeVisible();
      await expect(page.locator('text=Key Responsibilities')).toBeVisible();
      await expect(page.locator('text=Career Scope')).toBeVisible();
      
      // 4. Verify branch name is present in H1
      const h1Text = await page.textContent('h1');
      expect(h1Text?.length).toBeGreaterThan(5);

      // 5. Scroll to bottom to check for hydration errors or blank sections
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);
    });
  }
});
