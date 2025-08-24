import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['list'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'http://localhost:5001',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Video on failure */
    video: 'retain-on-failure',
    
    /* Default timeout for actions */
    actionTimeout: 30000,
    
    /* Default navigation timeout */
    navigationTimeout: 30000,
  },

  /* Configure timeouts */
  timeout: 60000,
  expect: {
    timeout: 10000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
      },
    },

    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1280, height: 720 },
      },
    },

    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari'],
        viewport: { width: 1280, height: 720 },
      },
    },

    /* Test against mobile viewports. */
    {
      name: 'mobile-chrome',
      use: { 
        ...devices['Pixel 5'],
      },
    },
    {
      name: 'mobile-safari',
      use: { 
        ...devices['iPhone 12'],
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: [
    {
      command: 'npm run dev',
      port: 5001,
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
      cwd: path.join(__dirname),
      env: {
        ...process.env,
        PORT: '5001',
      },
    },
    {
      command: 'npm run start:dev',
      port: 4000,
      timeout: 120 * 1000,
      reuseExistingServer: !process.env.CI,
      cwd: path.join(__dirname, '..', 'blog-backend'),
      env: {
        ...process.env,
        PORT: '4000',
      },
    },
  ],

  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  outputDir: 'test-results/',
});