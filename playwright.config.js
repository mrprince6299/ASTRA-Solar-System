import {defineConfig, devices} from '@playwright/test';

const APP_PORT = 4174;

export default defineConfig({
  forbidOnly: !!process.env.CI,
  fullyParallel: true,
  projects: [
    {name: 'desktop', use: {...devices['Desktop Chrome']}},
    {name: 'mobile', use: {...devices['Pixel 7']}},
  ],
  reporter: process.env.CI ? [['github'], ['html', {open: 'never'}]] : 'list',
  retries: process.env.CI ? 1 : 0,
  testDir: 'e2e',
  timeout: 60_000,
  workers: 2,
  expect: {timeout: 15_000},
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${APP_PORT}/`,
    trace: {mode: 'retain-on-failure', screenshots: false, snapshots: false},
    launchOptions: {executablePath: process.env.CHROMIUM_PATH ?? undefined},
  },
  webServer: {
    command: 'npm run serve',
    port: APP_PORT,
    reuseExistingServer: !process.env.CI,
  },
});
