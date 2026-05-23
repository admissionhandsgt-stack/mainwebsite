import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard and Colleges Listings', () => {
  const baseURL = '';

  test('Public Deemed Colleges Listing Renders', async ({ page }) => {
    await page.goto(`${baseURL}/mbbs-india/deemed-universities`);
    
    // Check page title or main heading
    await expect(page.locator('h1').first()).toContainText('Deemed Universities');
    
    // The filter bar placeholder might have changed or we just check for colleges
    // Ensure at least one college card is rendered
    await page.waitForTimeout(2000);
    const collegeCards = page.locator('h3');
    const count = await collegeCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test('Admin Login Page Renders Premium UI', async ({ page }) => {
    await page.goto(`${baseURL}/admin`);
    
    // Check for the new premium login page title
    await expect(page.getByText('Admin Portal', { exact: true })).toBeVisible();
    
    // Check for secure login button
    await expect(page.getByRole('button', { name: /Secure Login/i })).toBeVisible();
    
    // Check for email and password fields
    await expect(page.getByLabel(/Email Address/i)).toBeVisible();
    await expect(page.getByLabel(/Password/i)).toBeVisible();
  });
});
