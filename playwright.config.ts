import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false, workers: 1,
  reporter: 'list', timeout: 30000,
  globalSetup: './tests/e2e/server.ts',
  use: { baseURL: 'http://127.0.0.1:4173/2bedAndroidVibraDorm/', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], channel: process.env.PLAYWRIGHT_CHANNEL } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: process.env.PLAYWRIGHT_CHANNEL } },
  ],
});
