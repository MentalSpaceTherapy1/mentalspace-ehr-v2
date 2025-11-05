import { test, expect } from '@playwright/test';

test('test fresh clone', async ({ page }) => {
  const consoleMessages: string[] = [];
  page.on('console', msg => consoleMessages.push(`[${msg.type()}] ${msg.text()}`));
  page.on('pageerror', error => consoleMessages.push(`[ERROR] ${error.message}`));

  await page.goto('http://localhost:5181/login', { waitUntil: 'networkidle' });

  console.log('Browser console output:', consoleMessages.join('\n'));

  // Try to find the email field
  const emailInput = await page.locator('#email').count();
  console.log('Email input found:', emailInput > 0);

  if (emailInput > 0) {
    console.log('SUCCESS! Fresh clone works!');
    await page.screenshot({ path: 'fresh-clone-success.png', fullPage: true });
  } else {
    console.log('FAILED: Email input not found');
    await page.screenshot({ path: 'fresh-clone-failed.png', fullPage: true });
  }
});
