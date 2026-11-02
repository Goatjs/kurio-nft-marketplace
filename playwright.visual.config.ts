import { defineConfig, devices } from '@playwright/test';

/**
 * Configuração visual isolada. Não altera nem reroda os 28 testes já aprovados.
 * Baselines distintas por project/viewport no Windows/Chromium.
 */
export default defineConfig({
  testDir: './visual-tests',
  testMatch: '**/visual-regression.spec.ts',
  timeout: 45_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    reducedMotion: 'reduce',
    locale: 'pt-BR',
  },
  reporter: [['html', { open: 'never' }], ['list']],
  projects: [
    {
      name: 'visual-mobile-390',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
      },
    },
    {
      name: 'visual-tablet-768',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
        deviceScaleFactor: 1,
      },
    },
    {
      name: 'visual-desktop-1440',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
      },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
});
