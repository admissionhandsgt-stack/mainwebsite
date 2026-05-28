import { test, expect } from '@playwright/test';

async function makeStickyElementsAbsolute(page) {
  await page.evaluate(() => {
    const allEls = document.querySelectorAll('*');
    allEls.forEach(el => {
      const computedStyle = window.getComputedStyle(el);
      if (computedStyle.position === 'fixed' || computedStyle.position === 'sticky') {
        (el as HTMLElement).style.position = 'absolute';
      }
    });
  });
}

test('Take screenshots of services, know-us, and neet process pages', async ({ page }) => {
  // Services page
  await page.goto('/services');
  await page.waitForLoadState('networkidle');
  await page.locator('h1').waitFor({ state: 'visible' });
  
  // Scroll down step-by-step to trigger whileInView animations
  const viewport = page.viewportSize();
  const step = viewport ? viewport.height / 2 : 400;
  const totalHeight = await page.evaluate(() => document.body.scrollHeight);
  
  for (let y = 0; y < totalHeight; y += step) {
    await page.evaluate((scrollToY) => window.scrollTo(0, scrollToY), y);
    await page.waitForTimeout(150);
  }
  
  // Wait at the bottom for animations to finish
  await page.waitForTimeout(1500);
  
  // Scroll back to top to align absolute headers properly
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  
  await makeStickyElementsAbsolute(page);
  await page.screenshot({ path: 'tests/services-page.png', fullPage: true });

  // Know Us page
  await page.goto('/know-us');
  await page.waitForLoadState('networkidle');
  await page.locator('h1').waitFor({ state: 'visible' });
  
  const totalHeightKnowUs = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < totalHeightKnowUs; y += step) {
    await page.evaluate((scrollToY) => window.scrollTo(0, scrollToY), y);
    await page.waitForTimeout(150);
  }
  
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  
  await makeStickyElementsAbsolute(page);
  await page.screenshot({ path: 'tests/know-us-page.png', fullPage: true });

  // NEET UG Process page
  await page.goto('/neet-ug-process');
  await page.waitForLoadState('networkidle');
  
  const totalHeightProcess = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < totalHeightProcess; y += step) {
    await page.evaluate((scrollToY) => window.scrollTo(0, scrollToY), y);
    await page.waitForTimeout(150);
  }
  
  await page.waitForTimeout(1500);
  
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  
  await makeStickyElementsAbsolute(page);
  await page.screenshot({ path: 'tests/neet-ug-process-page.png', fullPage: true });

  // PG MD/MS page
  await page.goto('/md-ms-india');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  const totalHeightPG = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < totalHeightPG; y += step) {
    await page.evaluate((scrollToY) => window.scrollTo(0, scrollToY), y);
    await page.waitForTimeout(150);
  }
  
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(200);
  
  await makeStickyElementsAbsolute(page);
  await page.screenshot({ path: 'tests/pg-mdms-page.png', fullPage: true });
});
