import { test } from '@playwright/test';

test('get detailed error info', async ({ page }) => {
  await page.goto('http://localhost:5177/login');

  // Wait a bit for error to occur
  await page.waitForTimeout(3000);

  // Get all loaded scripts
  const scripts = await page.evaluate(() => {
    const scriptTags = Array.from(document.querySelectorAll('script'));
    return scriptTags.map(s => ({ src: s.src, type: s.type }));
  });

  console.log('LOADED SCRIPTS:', JSON.stringify(scripts, null, 2));

  // Get console errors from the browser
  const consoleErrors = await page.evaluate(() => {
    return (window as any).__consoleErrors || [];
  });

  console.log('CONSOLE ERRORS:', consoleErrors);
});
