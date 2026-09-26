import { test, expect } from '@playwright/test';

test('Admin Login console logs', async ({ page }) => {
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
  await page.goto('/admin');
  await page.fill('input[type=email]', 'admin@admissionhands.com');
  await page.fill('input[type=password]', 'Admin@12345');
  await page.click('button:has-text("Secure Login")');
  await page.waitForTimeout(2000);
});
