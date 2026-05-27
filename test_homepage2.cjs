const { chromium } = require('@playwright/test');
const path = require('path');

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const errors = [];
  page.on('pageerror', exception => {
    errors.push(`Uncaught exception: ${exception}`);
  });
  
  page.on('console', msg => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      errors.push(`Console ${msg.type()}: ${msg.text()}`);
    }
  });

  try {
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    console.log('Page loaded.');
    
    // Scroll down slowly to trigger whileInView animations
    for (let i = 0; i < 10; i++) {
        await page.evaluate(() => window.scrollBy(0, 500));
        await page.waitForTimeout(500);
    }
    
    // Scroll back to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1000);
    
    const screenshotPath = path.join(__dirname, 'homepage-screenshot-2.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Saved screenshot to ${screenshotPath}`);
    
    if (errors.length > 0) {
      console.error('Client-side console messages found:');
      errors.forEach(e => console.error(e));
    } else {
      console.log('No client-side errors/warnings detected.');
    }
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await browser.close();
  }
}

run();
