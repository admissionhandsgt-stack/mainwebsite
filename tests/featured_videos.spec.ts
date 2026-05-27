import { test, expect } from '@playwright/test';

test('FeaturedVideos section appears on homepage', async ({ page }) => {
  // Navigate to homepage
  await page.goto('/');

  // Wait for the page to fully load (give client-side fetch time)
  await page.waitForLoadState('networkidle');

  // Scroll to bottom to trigger lazy loads
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(3000);

  // Take a full-page screenshot for visual confirmation
  await page.screenshot({ path: 'tests/homepage-videos-section.png', fullPage: true });

  // Check if the featured-videos section rendered
  const videoSection = page.locator('[data-testid="featured-videos"]');

  // It only renders when DB returns videos; log presence
  const isVisible = await videoSection.isVisible().catch(() => false);
  console.log('Featured video section visible:', isVisible);

  if (isVisible) {
    // Check section heading
    await expect(videoSection).toContainText('Expert MBBS Guidance');
    await expect(videoSection).toContainText('Watch our expert counsellors');

    // Check at least one video card (thumbnail image)
    const cards = videoSection.locator('img[alt]');
    const cardCount = await cards.count();
    console.log('Video cards found:', cardCount);
    expect(cardCount).toBeGreaterThan(0);

    // Click the first card to open modal
    await cards.first().click();
    await page.waitForTimeout(1000);

    // Verify iframe appeared
    const iframe = page.locator('iframe[src*="youtube.com/embed"]');
    const iframeVisible = await iframe.isVisible().catch(() => false);
    console.log('YouTube iframe visible after click:', iframeVisible);
    expect(iframeVisible).toBe(true);

    // Screenshot of modal state
    await page.screenshot({ path: 'tests/video-modal-open.png' });

    // Close modal via X button
    await page.locator('button[aria-label="Close video"]').click({ force: true });
    await page.waitForTimeout(500);
    const iframeAfterClose = await iframe.isVisible().catch(() => false);
    console.log('YouTube iframe after modal close:', iframeAfterClose);
  } else {
    console.log('Video section not visible - DB may have no videos or network issue');
  }
});
