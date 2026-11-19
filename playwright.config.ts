import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/ui',
  use: {
    baseURL: 'http://127.0.0.1:5199',
    viewport: { width: 1000, height: 900 },
    timezoneId: 'Europe/Copenhagen',
    browserName: 'chromium',
    // Use installed Chrome on Mac; CI can install Playwright Chromium.
    ...(process.platform === 'darwin' ? { channel: 'chrome' } : {}),
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run preview:planning',
    env: { PORT: '5199' },
    url: 'http://127.0.0.1:5199',
    reuseExistingServer: false,
  },
});
