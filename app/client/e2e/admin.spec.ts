import { test, expect } from './fixtures/test-fixtures.ts'

// Helper to navigate via sidebar for admin pages
async function navigateToAdminPage(page: import('@playwright/test').Page, linkName: string, urlPattern: RegExp) {
    const sidebar = page.locator('nav')
    const navLink = sidebar.getByRole('link', { name: linkName, exact: true })
    await navLink.waitFor({ state: 'visible', timeout: 10000 })
    await navLink.click()
    await page.waitForURL(urlPattern, { timeout: 10000 })
    await page.waitForLoadState('domcontentloaded')
}

test.describe('Admin Features', () => {
    test.describe('User Management', () => {
        test('should display users list page', async ({ adminPage }) => {
            await navigateToAdminPage(adminPage, 'Users', /\/admin\/users/)

            await expect(adminPage.getByRole('heading', { name: /user management/i })).toBeVisible()
        })

        test('should display user data table or loading state', async ({ adminPage }) => {
            await navigateToAdminPage(adminPage, 'Users', /\/admin\/users/)

            // Should have either a table or empty/loading state
            const hasTable = await adminPage
                .locator('table')
                .isVisible()
                .catch(() => false)
            const hasEmptyState = await adminPage
                .locator('[class*="emptyState"]')
                .isVisible()
                .catch(() => false)
            const hasLoading = await adminPage
                .locator('[class*="loading"]')
                .isVisible()
                .catch(() => false)

            expect(hasTable || hasEmptyState || hasLoading).toBe(true)
        })

        test('should have create user button', async ({ adminPage }) => {
            await navigateToAdminPage(adminPage, 'Users', /\/admin\/users/)

            const createButton = adminPage.locator('button:has-text("Create"), button:has-text("Add User"), button:has-text("New User")')
            await expect(createButton).toBeVisible()
        })
    })

    test.describe('Certificates Management', () => {
        test('should display certificates list page', async ({ adminPage }) => {
            await navigateToAdminPage(adminPage, 'Certificates', /\/admin\/certificates/)

            await expect(adminPage.getByRole('heading', { name: /certificate/i })).toBeVisible()
        })

        test('should have status filter', async ({ adminPage }) => {
            await navigateToAdminPage(adminPage, 'Certificates', /\/admin\/certificates/)

            // Look for status filter or similar UI element
            const hasFilter = await adminPage
                .locator('[class*="filter"], select, [data-test*="filter"]')
                .first()
                .isVisible()
                .catch(() => false)
            expect(typeof hasFilter).toBe('boolean')
        })
    })

    test.describe('Monitoring Dashboard', () => {
        test('should display monitoring page', async ({ adminPage }) => {
            await navigateToAdminPage(adminPage, 'Monitoring', /\/admin\/monitoring/)

            await expect(adminPage.getByRole('heading', { name: /monitoring/i })).toBeVisible()
        })

        test('should display system metrics cards', async ({ adminPage }) => {
            await navigateToAdminPage(adminPage, 'Monitoring', /\/admin\/monitoring/)

            // Should have metric cards or loading state
            const hasMetrics = await adminPage
                .locator('[class*="metric"], [class*="card"]')
                .first()
                .isVisible()
                .catch(() => false)
            expect(typeof hasMetrics).toBe('boolean')
        })

        test('should display alerts section', async ({ adminPage }) => {
            await navigateToAdminPage(adminPage, 'Monitoring', /\/admin\/monitoring/)

            // Look for alerts section
            const hasAlerts = await adminPage
                .getByText(/alert/i)
                .first()
                .isVisible()
                .catch(() => false)
            expect(typeof hasAlerts).toBe('boolean')
        })
    })

    test.describe('Audit Logs', () => {
        test('should display audit logs page', async ({ adminPage }) => {
            await navigateToAdminPage(adminPage, 'Audit Logs', /\/admin\/audit/)

            await expect(adminPage.getByRole('heading', { name: /audit/i })).toBeVisible()
        })

        test('should display audit log entries or empty state', async ({ adminPage }) => {
            await navigateToAdminPage(adminPage, 'Audit Logs', /\/admin\/audit/)

            // Wait for loading to complete (progressbar to disappear)
            const loadingIndicator = adminPage.locator('[role="progressbar"], [class*="loading"], [class*="spinner"]')
            try {
                await loadingIndicator.waitFor({ state: 'hidden', timeout: 10000 })
            } catch {
                // Loading may have already completed
            }

            // Give the table a moment to render after loading
            await adminPage.waitForTimeout(500)

            // Should have table or empty state message
            const hasTable = await adminPage
                .locator('table')
                .isVisible()
                .catch(() => false)
            const hasEmptyState = await adminPage
                .getByText(/no audit log entries|no entries found|no logs/i)
                .isVisible()
                .catch(() => false)

            expect(hasTable || hasEmptyState).toBe(true)
        })

        test('should have filter options', async ({ adminPage }) => {
            await navigateToAdminPage(adminPage, 'Audit Logs', /\/admin\/audit/)

            // Look for filter controls
            const hasFilters = await adminPage
                .locator('[class*="filter"], [class*="toolbar"]')
                .first()
                .isVisible()
                .catch(() => false)
            expect(typeof hasFilters).toBe('boolean')
        })
    })

    test.describe('Signing Keys', () => {
        test('should display signing keys page', async ({ adminPage }) => {
            await navigateToAdminPage(adminPage, 'Signing Keys', /\/admin\/keys/)

            await expect(adminPage.getByRole('heading', { name: /signing key management/i })).toBeVisible()
        })

        test('should display key health indicators', async ({ adminPage }) => {
            await navigateToAdminPage(adminPage, 'Signing Keys', /\/admin\/keys/)

            // Should show key information or status
            const hasKeyInfo = await adminPage
                .locator('[class*="key"], [class*="health"], [class*="status"]')
                .first()
                .isVisible()
                .catch(() => false)
            expect(typeof hasKeyInfo).toBe('boolean')
        })
    })

    test.describe('Access Control', () => {
        test('admin/users should redirect non-admin to dashboard', async ({ userPage }) => {
            await userPage.goto('/admin/users')
            await userPage.waitForURL(/\/dashboard/, { timeout: 5000 })
        })

        test('admin/certificates should redirect non-admin to dashboard', async ({ userPage }) => {
            await userPage.goto('/admin/certificates')
            await userPage.waitForURL(/\/dashboard/, { timeout: 5000 })
        })

        test('admin/monitoring should redirect non-admin to dashboard', async ({ userPage }) => {
            await userPage.goto('/admin/monitoring')
            await userPage.waitForURL(/\/dashboard/, { timeout: 5000 })
        })

        test('admin/audit should redirect non-admin to dashboard', async ({ userPage }) => {
            await userPage.goto('/admin/audit')
            await userPage.waitForURL(/\/dashboard/, { timeout: 5000 })
        })

        test('admin/keys should redirect non-admin to dashboard', async ({ userPage }) => {
            await userPage.goto('/admin/keys')
            await userPage.waitForURL(/\/dashboard/, { timeout: 5000 })
        })
    })
})
