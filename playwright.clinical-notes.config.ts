import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/clinical-notes/specs',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['json', { outputFile: 'test-reports/clinical-notes/results.json' }], ['html', { outputFolder: 'test-reports/clinical-notes/html' }]],
  use: {
    baseURL: process.env.FRONTEND_URL || 'https://www.mentalspaceehr.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

