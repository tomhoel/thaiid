const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE ${msg.type()}]:`, msg.text());
  });

  page.on('pageerror', err => {
    console.error(`[BROWSER UNCAUGHT ERROR]:`, err);
  });

  console.log('Navigating to http://127.0.0.1:5173/ ...');
  try {
    const resp = await page.goto('http://127.0.0.1:5173/', { waitUntil: 'networkidle', timeout: 8000 });
    console.log('Response status:', resp ? resp.status() : 'no response');
  } catch (e) {
    console.log('Navigation warning/timeout:', e.message);
  }

  await page.waitForTimeout(2000);
  const html = await page.content();
  console.log('Page HTML length:', html.length);
  console.log('Root innerHTML:', await page.$eval('#root', el => el.innerHTML).catch(e => e.message));

  await browser.close();
})();
