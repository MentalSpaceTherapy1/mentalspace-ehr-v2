import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * Enhanced Playwright configuration with browser extension support
 * This config loads browser extensions to help with testing Material-UI components
 * and complex React forms that are difficult to automate with standard Playwright
 */

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: 'http://localhost:5175',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    // Increase timeout for complex Material-UI interactions
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium-with-extensions',
      use: {
        ...devices['Desktop Chrome'],
        // Launch Chrome with extensions support
        launchOptions: {
          args: [
            // Enable extensions
            '--enable-extensions',
            // Disable security for easier testing
            '--disable-web-security',
            '--disable-features=IsolateOrigins,site-per-process',
            // Load specific extensions (paths to unpacked extensions)
            `--load-extension=${path.join(__dirname, 'test-extensions/react-devtools')}`,
            `--load-extension=${path.join(__dirname, 'test-extensions/mui-helper')}`,
            // Disable headless for extension support
            '--headed',
          ],
          headless: false, // Extensions don't work in headless mode
        },
        // Custom context options
        contextOptions: {
          // Accept downloads for testing file exports
          acceptDownloads: true,
          // Grant all permissions for easier testing
          permissions: ['geolocation', 'notifications', 'camera', 'microphone'],
        },
      },
    },
    {
      name: 'chromium-debug',
      use: {
        ...devices['Desktop Chrome'],
        // Debug mode with slower actions for troubleshooting
        launchOptions: {
          slowMo: 500, // Slow down actions by 500ms
          devtools: true, // Open DevTools automatically
          headless: false,
        },
      },
    },
    {
      name: 'chromium-headless',
      use: {
        ...devices['Desktop Chrome'],
        // Standard headless for CI/CD
        headless: true,
      },
    },
  ],

  // Dev server configuration
  webServer: [
    {
      command: 'cd packages/backend && npm run dev',
      port: 3001,
      reuseExistingServer: true,
      timeout: 120000,
    },
    {
      command: 'cd packages/frontend && npm run dev',
      port: 5175,
      reuseExistingServer: true,
      timeout: 120000,
    },
  ],
});