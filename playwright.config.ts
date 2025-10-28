import { defineConfig, devices } from '@playwright/test';

/**
 * DevHub E2E Test Configuration
 *
 * This configuration sets up Playwright for end-to-end testing of the DevHub application.
 * Tests require both frontend (port 3000) and backend (port 5000) to be running.
 */
export default defineConfig({
  testDir: './e2e',

  // Maximum time one test can run for
  timeout: 60 * 1000,

  // Test execution settings
  fullyParallel: false, // Run tests serially to avoid database conflicts
  forbidOnly: !!process.env.CI, // Fail CI if test.only is committed
  retries: process.env.CI ? 2 : 0, // Retry failed tests in CI
  workers: process.env.CI ? 1 : 1, // Use single worker to avoid race conditions

  // Reporter to use
  reporter: [
    ['html'],
    ['list'],
    ...(process.env.CI ? [['github'] as const] : []),
  ],

  // Shared settings for all the projects below
  use: {
    // Base URL for the application
    baseURL: 'http://localhost:3000',

    // Collect trace on failure
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Timeout for each action (click, fill, etc.)
    actionTimeout: 10000,

    // Timeout for navigation
    navigationTimeout: 30000,
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Uncomment to test on other browsers
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Web server configuration
  // Assumes you run `npm run dev` before running tests
  // Uncomment to auto-start the dev servers
  webServer: [
    {
      command: 'npm run dev:backend',
      port: 5000,
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev:frontend',
      port: 3000,
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
