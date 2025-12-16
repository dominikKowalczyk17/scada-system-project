import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Collect console logs
  const consoleLogs = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(`[${msg.type()}] ${text}`);
    console.log(`[${msg.type().toUpperCase()}]`, text);
  });

  console.log('Navigating to http://localhost:5173...');
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

  // Wait for dashboard data to load
  console.log('Waiting for dashboard to load...');
  await page.waitForTimeout(5000);

  // Take screenshot
  console.log('Taking screenshot...');
  await page.screenshot({
    path: 'dashboard-screenshot.png',
    fullPage: true
  });

  console.log('Screenshot saved to dashboard-screenshot.png');
  console.log('\n=== Console Logs Summary ===');
  console.log(consoleLogs.join('\n'));

  await browser.close();
})();
