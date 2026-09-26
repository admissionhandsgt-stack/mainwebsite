import { test, expect } from '@playwright/test';

test.describe('Mobile Usability & Responsiveness Deep Audit', () => {
  // Only run on emulated mobile device viewports (e.g. mobile-light, mobile-dark)
  test.beforeEach(async ({}, testInfo) => {
    test.skip(!testInfo.project.name.includes('mobile'), 'This suite is dedicated to mobile viewport testing.');
  });

  const pagesToAudit = [
    '/',
    '/mbbs-india',
    '/mbbs-india/colleges',
    '/mbbs-india/deemed-universities',
    '/neet-ug-process',
    '/services',
    '/know-us'
  ];

  for (const path of pagesToAudit) {
    test(`Audit ${path} for horizontal overflow and tap targets`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState('networkidle');

      // 1. Verify NO horizontal overflow (which causes accidental horizontal scrolling)
      const overflowDetails = await page.evaluate(() => {
        const scrollWidth = document.documentElement.scrollWidth;
        const innerWidth = window.innerWidth;
        const bodyScrollWidth = document.body.scrollWidth;
        
        // Find elements contributing to overflow if any
        let overflowElementSelector: { tag: string; id: string; class: string; right: number; windowWidth: number; } | null = null;
        if (scrollWidth > innerWidth || bodyScrollWidth > innerWidth) {
          const allElements = Array.from(document.querySelectorAll('*'));
          for (const el of allElements) {
            const rect = el.getBoundingClientRect();
            if (rect.right > innerWidth) {
              overflowElementSelector = {
                tag: el.tagName.toLowerCase(),
                id: el.id || '',
                class: el.className || '',
                right: rect.right,
                windowWidth: innerWidth
              };
              break;
            }
          }
        }

        return {
          hasOverflow: scrollWidth > innerWidth || bodyScrollWidth > innerWidth,
          scrollWidth,
          bodyScrollWidth,
          innerWidth,
          overflowElement: overflowElementSelector
        };
      });

      if (overflowDetails.hasOverflow) {
        console.warn(`[⚠️ Usability Warning] Horizontal scroll overflow detected on ${path}!`, overflowDetails);
      }
      expect(overflowDetails.hasOverflow).toBe(false);

      // 2. Audit interactive elements for minimum tap target size (Apple/Android standard: >= 40px)
      const tinyTapTargets = await page.evaluate(() => {
        const interactiveElements = Array.from(document.querySelectorAll('button, a, input, select, textarea'));
        const tinyElements: any[] = [];
        
        for (const el of interactiveElements) {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue; // Skip hidden elements
          
          // Flag anything smaller than 36px width or height that is not inline paragraph text
          if ((rect.width < 36 || rect.height < 36) && !el.closest('p, span, li')) {
            tinyElements.push({
              tag: el.tagName.toLowerCase(),
              text: el.textContent?.trim().slice(0, 30) || '',
              id: el.id || '',
              class: el.className.slice(0, 50) || '',
              width: rect.width,
              height: rect.height
            });
          }
        }
        return tinyElements;
      });

      if (tinyTapTargets.length > 0) {
        console.log(`[💡 Information] Found ${tinyTapTargets.length} small tap targets on ${path}. Verify they are easily touchable:`, tinyTapTargets.slice(0, 5));
      }
    });
  }

  test('Mobile Navigation Menu Drawer and Navigation Flow', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 1. Locate the mobile menu button (Hamburger Menu)
    const menuButton = page.locator('button[aria-label="Toggle Menu"], button:has(.lucide-menu), button:has-text("menu")').first();
    await expect(menuButton).toBeVisible();

    // 2. Click the Hamburger Menu button to open the Drawer
    await menuButton.click();
    await page.waitForTimeout(1000);

    // 3. Confirm navigation links inside the drawer are visible and functional
    const servicesLink = page.locator('nav[role="navigation"] a[href="/services"]').first();
    await expect(servicesLink).toBeVisible();

    // 4. Click the link and verify successful mobile navigation
    await servicesLink.click();
    await page.waitForURL(/\/services/);
    
    // Check if services page loaded successfully on mobile
    await expect(page.locator('h1')).toContainText('Advantage');
  });
});
