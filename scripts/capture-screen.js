const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 412, height: 915 } });

  page.on('console', msg => console.log(`[CONSOLE]:`, msg.text()));
  page.on('pageerror', err => console.error(`[PAGE ERROR]:`, err));

  await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  const screenshotPath = path.join(__dirname, 'onboarding-screen.png');
  await page.screenshot({ path: screenshotPath });
  console.log('Saved screenshot to:', screenshotPath);

  await browser.close();
})();
