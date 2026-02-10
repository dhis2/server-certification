import { test as base, expect, Page } from '@playwright/test'

/**
 * Custom test fixtures for DHIS2 Server Certification tests
 * @see https://playwright.dev/docs/test-fixtures
 */

// Test user credentials - these should match seeded test data
// Default dev credentials from api/src/database/seeds/seed.ts
// Can be overridden via environment variables:
// - SEED_DEV_ADMIN_EMAIL / SEED_DEV_ADMIN_PASSWORD
// - SEED_DEV_USER_EMAIL / SEED_DEV_USER_PASSWORD
export const TEST_USERS = {
    admin: {
        email: process.env.TEST_ADMIN_EMAIL || 'admin@localhost.dev',
        password: process.env.TEST_ADMIN_PASSWORD || 'DevAdmin#2024!',
        role: 'Admin',
    },
    user: {
        email: process.env.TEST_USER_EMAIL || 'user@localhost.dev',
        password: process.env.TEST_USER_PASSWORD || 'DevUser#2024!',
        role: 'User',
    },
    // TFA user - only used if a TFA-enabled user is seeded
    tfaUser: {
        email: process.env.TEST_TFA_EMAIL || 'tfa@localhost.dev',
        password: process.env.TEST_TFA_PASSWORD || 'TfaUser#2024!',
        role: 'User',
    },
}

// Storage state paths for authenticated sessions (kept for compatibility)
const ADMIN_STORAGE_STATE = 'e2e/.auth/admin.json'
const USER_STORAGE_STATE = 'e2e/.auth/user.json'

export interface TestFixtures {
    authenticatedPage: Page
    adminPage: Page
    userPage: Page
}

export interface WorkerFixtures {
    adminStorageState: string
    userStorageState: string
}

/**
 * Helper to perform login
 * Note: JWT tokens expire quickly (15 seconds), so we perform fresh login for each test
 */
const performLogin = async (page: Page, email: string, password: string): Promise<boolean> => {
    console.log(`[Login] Starting login for ${email}...`)
    await page.goto('/')
    await page.waitForLoadState('domcontentloaded')
    console.log(`[Login] Page loaded, URL: ${page.url()}`)

    // Wait for login form
    const emailInput = page.getByRole('textbox', { name: /email/i })
    await emailInput.waitFor({ state: 'visible', timeout: 10000 })
    console.log(`[Login] Login form visible`)

    // Fill credentials using role-based locators
    await emailInput.fill(email)
    await page.getByRole('textbox', { name: /password/i }).fill(password)

    // Submit using role-based locator
    await page.getByRole('button', { name: /sign in/i }).click()
    console.log(`[Login] Submitted credentials`)

    // Wait for navigation or error
    try {
        await page.waitForURL(/\/dashboard/, { timeout: 10000 })
        console.log(`[Login] Login successful, URL: ${page.url()}`)

        // Wait for authenticated layout to be visible (sidebar with nav links)
        const dashboardLink = page.getByRole('link', { name: /dashboard/i })
        await dashboardLink.waitFor({ state: 'visible', timeout: 10000 })
        console.log(`[Login] Authenticated layout rendered`)

        // Verify tokens are stored and check expiry
        const tokenInfo = await page.evaluate(() => {
            const tokensJson = localStorage.getItem('dhis2_cert_tokens')
            if (!tokensJson) return { hasTokens: false }

            try {
                const tokens = JSON.parse(tokensJson)
                const payload = JSON.parse(atob(tokens.accessToken.split('.')[1]))
                const now = Math.floor(Date.now() / 1000)
                return {
                    hasTokens: true,
                    iat: payload.iat,
                    exp: payload.exp,
                    validFor: payload.exp - payload.iat,
                    expiresIn: payload.exp - now,
                }
            } catch {
                return { hasTokens: true, parseError: true }
            }
        })
        console.log(`[Login] Token info:`, JSON.stringify(tokenInfo))

        return true
    } catch (error) {
        console.error(`[Login] Login failed, URL: ${page.url()}`)
        // Check for error message
        const errorMessage = await page.getByRole('alert').textContent().catch(() => null)
        if (errorMessage) {
            console.error(`[Login] Error message: ${errorMessage}`)
        }
        return false
    }
}

/**
 * Extended test with custom fixtures
 * Note: We do inline login for each page because the JWT tokens expire quickly (15 seconds)
 * and trying to reuse saved state doesn't work well with short-lived tokens.
 */
export const test = base.extend<TestFixtures, WorkerFixtures>({
    // Admin storage state fixture - kept for compatibility but not used for state restoration
    adminStorageState: [
        async ({}, use) => {
            await use(ADMIN_STORAGE_STATE)
        },
        { scope: 'worker' },
    ],

    // User storage state fixture - kept for compatibility but not used for state restoration
    userStorageState: [
        async ({}, use) => {
            await use(USER_STORAGE_STATE)
        },
        { scope: 'worker' },
    ],

    // Authenticated admin page - performs fresh login for each test
    adminPage: async ({ browser }, use) => {
        const context = await browser.newContext()
        const page = await context.newPage()

        // Perform fresh login for this test
        const loginSuccess = await performLogin(page, TEST_USERS.admin.email, TEST_USERS.admin.password)
        if (!loginSuccess) {
            console.error('Admin login failed - test will likely fail')
        }

        await use(page)
        await context.close()
    },

    // Authenticated user page - performs fresh login for each test
    userPage: async ({ browser }, use) => {
        const context = await browser.newContext()
        const page = await context.newPage()

        // Perform fresh login for this test
        const loginSuccess = await performLogin(page, TEST_USERS.user.email, TEST_USERS.user.password)
        if (!loginSuccess) {
            console.error('User login failed - test will likely fail')
        }

        await use(page)
        await context.close()
    },

    // Generic authenticated page (admin by default)
    authenticatedPage: async ({ adminPage }, use) => {
        await use(adminPage)
    },
})

export { expect }

/**
 * Test data helpers
 */
export const testData = {
    implementation: {
        name: `Test Implementation ${Date.now()}`,
        country: 'Test Country',
        contactEmail: 'test@example.com',
        contactPhone: '+1234567890',
        description: 'Test implementation for E2E testing',
        dhis2InstanceUrl: 'https://test.dhis2.org',
        dhis2Version: '2.40',
    },
    assessment: {
        assessorName: 'Test Assessor',
        systemEnvironment: 'Test environment for E2E testing',
    },
}

/**
 * Wait utilities
 */
export const waitFor = {
    loading: async (page: Page) => {
        await page.waitForLoadState('domcontentloaded')
    },
    noSpinner: async (page: Page) => {
        await page
            .locator('[data-test="loading"]')
            .waitFor({ state: 'hidden', timeout: 30000 })
            .catch(() => {
                // Spinner might not exist
            })
    },
    toast: async (page: Page, text: string) => {
        await expect(page.getByText(text)).toBeVisible({ timeout: 5000 })
    },
}
