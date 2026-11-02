import { defineConfig, devices } from '@playwright/test';

/**
 * KURIO — Smoke/E2E checks against the public Vercel deployment.
 * No local webServer: all page navigations go to the hosted domain.
 * REST, authentication, payments and Socket.IO remain MSW-based demos.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 45_000,
  expect: { timeout: 15_000 },
  retries: 0,
  workers: 2,
  use: {
    baseURL: 'https://kurio-nft-marketplace-six.vercel.app',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    serviceWorkers: 'allow',
  },
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report-public' }],
    ['list'],
  ],
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['Pixel 7'], browserName: 'chromium' },
    },
  ],
});
