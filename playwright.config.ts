import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://127.0.0.1:5173', ...devices['Desktop Chrome'],
    // Use an installed browser for local WebGL/media acceptance when requested.
    channel: process.env.PLAYWRIGHT_CHROMIUM_CHANNEL,
  },
  webServer: { command: 'npm run dev:web', port: 5173, reuseExistingServer: true },
});
