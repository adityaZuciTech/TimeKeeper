import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 2,
  forbidOnly: !!process.env.CI,
  retries: 1,
  timeout: 30_000,
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    headless: true,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Assumes the dev server is already running. Start it with `npm run dev`.
})
