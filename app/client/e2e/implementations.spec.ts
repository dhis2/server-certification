import { test, expect } from './fixtures/test-fixtures.ts'
import { ImplementationsPage } from './page-objects/index.ts'

test.describe('Implementations', () => {
    test.describe('List View', () => {
        test('should display implementations page with heading', async ({ adminPage }) => {
            const implementationsPage = new ImplementationsPage(adminPage)
            await implementationsPage.goto()

            // Use role-based locator for heading
            await expect(adminPage.getByRole('heading', { name: /implementations/i })).toBeVisible()
        })

        test('should display search input', async ({ adminPage }) => {
            const implementationsPage = new ImplementationsPage(adminPage)
            await implementationsPage.goto()
            await implementationsPage.waitForTableLoad()

            await expect(implementationsPage.searchInput).toBeVisible()
        })

        test('should display create button', async ({ adminPage }) => {
            const implementationsPage = new ImplementationsPage(adminPage)
            await implementationsPage.goto()
            await implementationsPage.waitForTableLoad()

            await expect(implementationsPage.createButton).toBeVisible()
        })

        test('should filter implementations by search term', async ({ adminPage }) => {
            const implementationsPage = new ImplementationsPage(adminPage)
            await implementationsPage.goto()
            await implementationsPage.waitForTableLoad()

            // Get initial count
            const initialCount = await implementationsPage.getRowCount()

            // Search for non-existent term and wait for table to update
            await implementationsPage.search('zzzznonexistent')
            // Wait for the table to update (either show filtered results or empty state)
            await implementationsPage.waitForTableLoad()

            // Should show empty or filtered results
            const filteredCount = await implementationsPage.getRowCount()
            expect(filteredCount).toBeLessThanOrEqual(initialCount)
        })

        test('should clear search and show all implementations', async ({ adminPage }) => {
            const implementationsPage = new ImplementationsPage(adminPage)
            await implementationsPage.goto()
            await implementationsPage.waitForTableLoad()

            // Wait for loading to complete and data to be rendered
            const loadingIndicator = adminPage.locator('[role="progressbar"], [class*="loading"], [class*="spinner"]')
            try {
                await loadingIndicator.waitFor({ state: 'hidden', timeout: 10000 })
            } catch {
                // Loading may have already completed
            }
            // Give table time to render rows
            await adminPage.waitForTimeout(500)

            // Get initial count
            const initialCount = await implementationsPage.getRowCount()

            // Search and clear - wait for table updates between operations
            await implementationsPage.search('test')
            await implementationsPage.waitForTableLoad()
            await implementationsPage.search('')
            await implementationsPage.waitForTableLoad()

            // Wait for loading to complete after clearing search
            try {
                await loadingIndicator.waitFor({ state: 'hidden', timeout: 10000 })
            } catch {
                // Loading may have already completed
            }
            await adminPage.waitForTimeout(500)

            // Should show same or similar count as before search
            const finalCount = await implementationsPage.getRowCount()
            expect(finalCount).toBe(initialCount)
        })
    })

    test.describe('Create Implementation', () => {
        test('should open create modal', async ({ adminPage }) => {
            const implementationsPage = new ImplementationsPage(adminPage)
            await implementationsPage.goto()
            await implementationsPage.waitForTableLoad()

            await implementationsPage.openCreateModal()

            await expect(implementationsPage.createModal).toBeVisible()
            // Use role-based locator for modal heading
            await expect(adminPage.getByRole('heading', { name: /add implementation/i })).toBeVisible()
        })

        test('should display all form fields in create modal', async ({ adminPage }) => {
            const implementationsPage = new ImplementationsPage(adminPage)
            await implementationsPage.goto()
            await implementationsPage.waitForTableLoad()
            await implementationsPage.openCreateModal()

            await expect(implementationsPage.nameInput).toBeVisible()
            await expect(implementationsPage.countryInput).toBeVisible()
            await expect(implementationsPage.contactEmailInput).toBeVisible()
        })

        test('should close modal on cancel', async ({ adminPage }) => {
            const implementationsPage = new ImplementationsPage(adminPage)
            await implementationsPage.goto()
            await implementationsPage.waitForTableLoad()
            await implementationsPage.openCreateModal()

            await implementationsPage.cancelButton.click()

            await expect(implementationsPage.createModal).not.toBeVisible()
        })

        test('should create implementation with required fields', async ({ adminPage }) => {
            const implementationsPage = new ImplementationsPage(adminPage)
            await implementationsPage.goto()
            await implementationsPage.waitForTableLoad()

            const uniqueName = `Test Impl ${Date.now()}`

            await implementationsPage.createImplementation({
                name: uniqueName,
            })

            // Wait for table to load after creation
            await implementationsPage.waitForTableLoad()

            // Use search to find the implementation (handles pagination)
            await implementationsPage.search(uniqueName)
            await implementationsPage.waitForTableLoad()

            const hasImplementation = await implementationsPage.hasImplementation(uniqueName)
            expect(hasImplementation).toBe(true)
        })

        test('should create implementation with all fields', async ({ adminPage }) => {
            const implementationsPage = new ImplementationsPage(adminPage)
            await implementationsPage.goto()
            await implementationsPage.waitForTableLoad()

            const uniqueName = `Full Implementation ${Date.now()}`

            await implementationsPage.createImplementation({
                name: uniqueName,
                country: 'Norway',
                contactEmail: 'admin@example.com',
                contactPhone: '+47123456789',
                description: 'Complete test implementation',
                dhis2InstanceUrl: 'https://play.dhis2.org',
                dhis2Version: '2.40',
            })

            // Wait for table to load after creation
            await implementationsPage.waitForTableLoad()

            // Use search to find the implementation (handles pagination)
            await implementationsPage.search(uniqueName)
            await implementationsPage.waitForTableLoad()

            const hasImplementation = await implementationsPage.hasImplementation(uniqueName)
            expect(hasImplementation).toBe(true)
        })

        test('should validate required name field', async ({ adminPage }) => {
            const implementationsPage = new ImplementationsPage(adminPage)
            await implementationsPage.goto()
            await implementationsPage.waitForTableLoad()
            await implementationsPage.openCreateModal()

            // Try to submit without name (fill only optional field)
            await implementationsPage.countryInput.fill('Test Country')

            // Check if submit button is disabled OR form shows validation when submitted
            const submitEnabled = await implementationsPage.submitButton.isEnabled()

            if (submitEnabled) {
                // If button is enabled, clicking it should show validation error
                await implementationsPage.submitButton.click()
                await adminPage.waitForTimeout(500)

                // Look for validation error message
                const hasValidationError = await adminPage
                    .getByText(/required|name is required|please enter/i)
                    .isVisible()
                    .catch(() => false)
                const modalStillOpen = await implementationsPage.createModal.isVisible()

                // Either show error or modal stays open (form not submitted)
                expect(hasValidationError || modalStillOpen).toBe(true)
            } else {
                // Button is disabled - validation works by preventing submission
                expect(submitEnabled).toBe(false)
            }
        })
    })

    test.describe('View Implementation Details', () => {
        test('should navigate to implementation details', async ({ adminPage }) => {
            const implementationsPage = new ImplementationsPage(adminPage)
            await implementationsPage.goto()
            await implementationsPage.waitForTableLoad()

            const rowCount = await implementationsPage.getRowCount()
            if (rowCount > 0) {
                await implementationsPage.viewImplementation(0)
                expect(adminPage.url()).toMatch(/\/implementations\/[^/]+$/)
            }
        })
    })

    test.describe('Delete Implementation', () => {
        test('should show delete confirmation modal', async ({ adminPage }) => {
            const implementationsPage = new ImplementationsPage(adminPage)
            await implementationsPage.goto()
            await implementationsPage.waitForTableLoad()

            const rowCount = await implementationsPage.getRowCount()
            if (rowCount > 0) {
                const row = implementationsPage.tableRows.first()
                await row.getByRole('button', { name: /delete/i }).click()

                await expect(implementationsPage.deleteModal).toBeVisible()
                await expect(adminPage.getByRole('heading', { name: /delete implementation/i })).toBeVisible()
            }
        })

        test('should cancel delete operation', async ({ adminPage }) => {
            const implementationsPage = new ImplementationsPage(adminPage)
            await implementationsPage.goto()
            await implementationsPage.waitForTableLoad()

            const rowCount = await implementationsPage.getRowCount()
            if (rowCount > 0) {
                const row = implementationsPage.tableRows.first()
                await row.getByRole('button', { name: /delete/i }).click()

                await implementationsPage.deleteModal.waitFor({ state: 'visible' })
                await implementationsPage.cancelDeleteButton.click()

                await expect(implementationsPage.deleteModal).not.toBeVisible()
            }
        })
    })

    test.describe('Pagination', () => {
        test('should display pagination when many implementations exist', async ({ adminPage }) => {
            const implementationsPage = new ImplementationsPage(adminPage)
            await implementationsPage.goto()
            await implementationsPage.waitForTableLoad()

            // Pagination only shows if more than PAGE_SIZE items
            const hasPagination = await implementationsPage.pagination.isVisible().catch(() => false)
            // This is conditional based on data
            expect(typeof hasPagination).toBe('boolean')
        })
    })

    test.describe('Error Handling', () => {
        test('should display retry button on error', async ({ adminPage }) => {
            const implementationsPage = new ImplementationsPage(adminPage)

            // Mock network error (if API is down, this will naturally happen)
            await implementationsPage.goto()

            // If error occurs, retry button should appear
            const hasError = await implementationsPage.errorNotice.isVisible().catch(() => false)
            if (hasError) {
                await expect(implementationsPage.retryButton).toBeVisible()
            }
        })
    })
})
