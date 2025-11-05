import { test } from '@playwright/test';

test('diagnose module error', async ({ page }) => {
  const errors: string[] = [];

  page.on('pageerror', (error) => {
    console.log('PAGE ERROR:', error.message);
    console.log('STACK:', error.stack);
    errors.push(`${error.message}\n${error.stack}`);
  });

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log('CONSOLE ERROR:', msg.text());
      console.log('LOCATION:', msg.location());
    }
  });

  await page.goto('http://localhost:5177/login', { waitUntil: 'networkidle' });

  await page.waitForTimeout(5000);

  console.log('\n\n===== ALL ERRORS =====');
  errors.forEach(e => console.log(e));
});
