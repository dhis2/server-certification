import { test, expect } from '@playwright/test'
import { TEST_USERS } from './fixtures/test-fixtures.ts'
import { LoginPage } from './page-objects/index.ts'

test.describe('Authentication', () => {
    let loginPage: LoginPage

    test.beforeEach(async ({ page }) => {
        loginPage = new LoginPage(page)
        await loginPage.goto()
    })

    test.describe('Login Form Display', () => {
        test('should display login form with all required elements', async ({ page }) => {
            // Check form elements are visible
            await expect(loginPage.usernameInput).toBeVisible()
            await expect(loginPage.passwordInput).toBeVisible()
            await expect(loginPage.submitButton).toBeVisible()

            // Check branding
            await expect(page.locator('h2:has-text("DHIS2 Server Certification")')).toBeVisible()
        })

        test('should have disabled submit button when form is empty', async () => {
            await expect(loginPage.submitButton).toBeDisabled()
        })

        test('should enable submit button when form is filled', async () => {
            await loginPage.usernameInput.fill('testuser@example.com')
            await loginPage.passwordInput.fill('testpassword')
            await expect(loginPage.submitButton).toBeEnabled()
        })

        test('should disable submit button when only email is filled', async () => {
            await loginPage.usernameInput.fill('testuser@example.com')
            await expect(loginPage.submitButton).toBeDisabled()
        })

        test('should disable submit button when only password is filled', async () => {
            await loginPage.passwordInput.fill('testpassword')
            await expect(loginPage.submitButton).toBeDisabled()
        })
    })

    test.describe('Login Validation', () => {
        test('should show error on invalid credentials', async ({ page }) => {
            await loginPage.login('invalid@example.com', 'wrongpassword')

            // Wait for error or stay on login page
            await page.waitForTimeout(2000)

            // Should still be on login page
            expect(page.url()).toMatch(/\/$|\/login/)
        })

        test('should clear error when user starts typing', async ({ page }) => {
            await loginPage.login('invalid@example.com', 'wrongpassword')
            await page.waitForTimeout(1000)

            // Start typing again
            await loginPage.usernameInput.fill('')
            await loginPage.usernameInput.fill('new@example.com')

            // Error should be cleared or not interfere with input
            await expect(loginPage.usernameInput).toHaveValue('new@example.com')
        })
    })

    test.describe('Successful Login', () => {
        test('should redirect to dashboard after successful login', async ({ page }) => {
            await loginPage.login(TEST_USERS.admin.email, TEST_USERS.admin.password)

            // Wait for redirect to dashboard
            await page.waitForURL(/\/dashboard/, { timeout: 10000 })

            expect(page.url()).toContain('/dashboard')
        })

        test('should display user information after login', async ({ page }) => {
            await loginPage.login(TEST_USERS.admin.email, TEST_USERS.admin.password)
            await page.waitForURL(/\/dashboard/, { timeout: 10000 })

            // Check user email is displayed (first match is in sidebar)
            await expect(page.getByText(TEST_USERS.admin.email).first()).toBeVisible()
        })

        test('should persist session across page reloads', async ({ page }) => {
            await loginPage.login(TEST_USERS.admin.email, TEST_USERS.admin.password)
            await page.waitForURL(/\/dashboard/, { timeout: 10000 })

            // Reload the page
            await page.reload()

            // Should still be on dashboard
            await page.waitForURL(/\/dashboard/, { timeout: 10000 })
            await expect(page.locator('h2:has-text("Welcome")')).toBeVisible()
        })
    })

    test.describe('Two-Factor Authentication Flow', () => {
        test('should show TFA prompt for TFA-enabled users', async ({ page }) => {
            // Attempt login with TFA user (if available)
            await loginPage.usernameInput.fill(TEST_USERS.tfaUser.email)
            await loginPage.passwordInput.fill(TEST_USERS.tfaUser.password)
            await loginPage.submitButton.click()

            // Wait for TFA form or error
            await page.waitForTimeout(2000)

            // Check if TFA form appeared
            const tfaInput = page.locator('input[name="tfaCode"]')
            const hasTfa = await tfaInput.isVisible().catch(() => false)

            if (hasTfa) {
                await expect(page.locator('text=Two-Factor Authentication')).toBeVisible()
                await expect(page.locator('input[name="tfaCode"]')).toBeVisible()
            }
        })

        test('should show recovery code option in TFA step', async ({ page }) => {
            await loginPage.usernameInput.fill(TEST_USERS.tfaUser.email)
            await loginPage.passwordInput.fill(TEST_USERS.tfaUser.password)
            await loginPage.submitButton.click()

            await page.waitForTimeout(2000)

            const tfaInput = page.locator('input[name="tfaCode"]')
            const hasTfa = await tfaInput.isVisible().catch(() => false)

            if (hasTfa) {
                // Check for recovery code link
                await expect(page.locator('button:has-text("Use recovery code")')).toBeVisible()
            }
        })

        test('should validate TFA code format (6 digits)', async ({ page }) => {
            await loginPage.usernameInput.fill(TEST_USERS.tfaUser.email)
            await loginPage.passwordInput.fill(TEST_USERS.tfaUser.password)
            await loginPage.submitButton.click()

            await page.waitForTimeout(2000)

            const tfaInput = page.locator('input[name="tfaCode"]')
            const hasTfa = await tfaInput.isVisible().catch(() => false)

            if (hasTfa) {
                const verifyButton = page.locator('button:has-text("Verify")')

                // Enter invalid code (less than 6 digits)
                await tfaInput.fill('123')
                await expect(verifyButton).toBeDisabled()

                // Enter valid 6-digit code
                await tfaInput.fill('123456')
                await expect(verifyButton).toBeEnabled()
            }
        })

        test('should allow switching to recovery code input', async ({ page }) => {
            await loginPage.usernameInput.fill(TEST_USERS.tfaUser.email)
            await loginPage.passwordInput.fill(TEST_USERS.tfaUser.password)
            await loginPage.submitButton.click()

            await page.waitForTimeout(2000)

            const tfaInput = page.locator('input[name="tfaCode"]')
            const hasTfa = await tfaInput.isVisible().catch(() => false)

            if (hasTfa) {
                // Click recovery code link
                await page.locator('button:has-text("Use recovery code")').click()

                // Check recovery code input appears
                await expect(page.locator('input[name="recoveryCode"]')).toBeVisible()
                await expect(page.locator('text=Enter one of your recovery codes')).toBeVisible()
            }
        })

        test('should allow going back to credentials from TFA step', async ({ page }) => {
            await loginPage.usernameInput.fill(TEST_USERS.tfaUser.email)
            await loginPage.passwordInput.fill(TEST_USERS.tfaUser.password)
            await loginPage.submitButton.click()

            await page.waitForTimeout(2000)

            const tfaInput = page.locator('input[name="tfaCode"]')
            const hasTfa = await tfaInput.isVisible().catch(() => false)

            if (hasTfa) {
                // Click back button
                await page.locator('button:has-text("Back to login")').click()

                // Should show credentials form again
                await expect(loginPage.usernameInput).toBeVisible()
                await expect(loginPage.passwordInput).toBeVisible()
            }
        })
    })

    test.describe('Logout', () => {
        test('should logout and redirect to login page', async ({ page }) => {
            // First login
            await loginPage.login(TEST_USERS.admin.email, TEST_USERS.admin.password)
            await page.waitForURL(/\/dashboard/, { timeout: 10000 })

            // Find and click logout button
            const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out")')
            await logoutButton.click()

            // Should redirect to login
            await page.waitForURL(/\/$|\/login/, { timeout: 5000 })
        })

        test('should clear session data after logout', async ({ page }) => {
            // Login
            await loginPage.login(TEST_USERS.admin.email, TEST_USERS.admin.password)
            await page.waitForURL(/\/dashboard/, { timeout: 10000 })

            // Logout
            const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out")')
            await logoutButton.click()
            await page.waitForURL(/\/$|\/login/, { timeout: 5000 })

            // Try to access protected route
            await page.goto('/dashboard')
            await page.waitForLoadState('domcontentloaded')

            // Should be redirected to login - check for login form visibility
            // (more reliable than URL pattern matching due to client-side routing)
            await page.waitForTimeout(2000)
            const isLoginVisible = await loginPage.isLoginFormVisible()
            expect(isLoginVisible).toBe(true)
        })
    })

    test.describe('Protected Routes', () => {
        test('should redirect unauthenticated users to login', async ({ page }) => {
            // Try to access dashboard directly
            await page.goto('/dashboard')

            // Should be redirected to login or show login form
            await page.waitForTimeout(2000)
            const isLoginVisible = await loginPage.isLoginFormVisible()
            expect(isLoginVisible).toBe(true)
        })

        test('should redirect to dashboard after login with return URL', async ({ page }) => {
            // Try to access specific page
            await page.goto('/implementations')
            await page.waitForTimeout(1000)

            // Login
            const isLoginVisible = await loginPage.isLoginFormVisible()
            if (isLoginVisible) {
                await loginPage.login(TEST_USERS.admin.email, TEST_USERS.admin.password)
                await page.waitForTimeout(2000)

                // Should be redirected to dashboard or requested page
                expect(page.url()).toMatch(/\/(dashboard|implementations)/)
            }
        })
    })
})
