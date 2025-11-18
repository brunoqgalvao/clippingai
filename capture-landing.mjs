import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // Set viewport to desktop size
  await page.setViewportSize({ width: 1920, height: 1080 });

  try {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 10000 });
    await page.screenshot({ path: 'landing-desktop.png', fullPage: true });
    console.log('✅ Desktop screenshot saved: landing-desktop.png');

    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await page.reload({ waitUntil: 'networkidle' });
    await page.screenshot({ path: 'landing-mobile.png', fullPage: true });
    console.log('✅ Mobile screenshot saved: landing-mobile.png');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  await browser.close();
})();
