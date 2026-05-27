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
    if (msg.type() === 'error') {
      errors.push(`Console error: ${msg.text()}`);
    }
  });

  try {
    console.log('Navigating to http://localhost:3000...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    console.log('Page loaded.');
    
    const screenshotPath = path.join(__dirname, 'homepage-screenshot.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`Saved screenshot to ${screenshotPath}`);
    
    if (errors.length > 0) {
      console.error('Client-side errors found:');
      errors.forEach(e => console.error(e));
    } else {
      console.log('No client-side errors detected.');
    }
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await browser.close();
  }
}

run();
