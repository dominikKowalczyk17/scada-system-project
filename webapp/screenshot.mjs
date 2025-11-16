import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

  // Wait for dashboard data to load
  console.log('Waiting for dashboard to load...');
  await page.waitForTimeout(3000);

  // Take screenshot
  console.log('Taking screenshot...');
  await page.screenshot({
    path: 'dashboard-screenshot.png',
    fullPage: true
  });

  // Check for console errors
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CONSOLE ERROR:', msg.text());
    }
  });

  console.log('Screenshot saved to dashboard-screenshot.png');

  await browser.close();
})();
