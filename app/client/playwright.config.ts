import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for DHIS2 Server Certification Client
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
    // Directory where tests are located
    testDir: './e2e',

    // Global setup/teardown
    globalSetup: './e2e/global-setup.ts',
    globalTeardown: './e2e/global-teardown.ts',

    // Output directory for test artifacts
    outputDir: 'test-results',

    // Timeout for each test
    timeout: 30 * 1000,

    // Timeout for expect() assertions
    expect: {
        timeout: 5000,
    },

    // Run tests in files in parallel
    fullyParallel: true,

    // Fail the build on CI if you accidentally left test.only in the source code
    forbidOnly: !!process.env.CI,

    // Retry on CI only
    retries: process.env.CI ? 2 : 0,

    // Opt out of parallel tests on CI for stability
    workers: process.env.CI ? 1 : undefined,

    // Reporter configuration
    reporter: [['html', { outputFolder: 'playwright-report' }], ['list'], ...(process.env.CI ? [['github'] as const] : [])],

    // Shared settings for all projects
    use: {
        // Base URL to use in actions like `await page.goto('/')`
        baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',

        // Collect trace when retrying the failed test
        trace: 'on-first-retry',

        // Capture screenshot on failure
        screenshot: 'only-on-failure',

        // Record video on failure
        video: 'on-first-retry',
    },

    // Configure projects for major browsers
    // Use --project flag to run specific browsers: npx playwright test --project=firefox
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },

        // Uncomment to run tests in additional browsers
        // {
        //   name: 'firefox',
        //   use: { ...devices['Desktop Firefox'] },
        // },

        // {
        //   name: 'webkit',
        //   use: { ...devices['Desktop Safari'] },
        // },

        // Mobile viewports
        // {
        //   name: 'Mobile Chrome',
        //   use: { ...devices['Pixel 5'] },
        // },

        // {
        //   name: 'Mobile Safari',
        //   use: { ...devices['iPhone 12'] },
        // },
    ],

    // Run your local dev server before starting the tests
    webServer: {
        command: 'npm run start',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },
})
