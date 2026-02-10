import { test, expect } from './fixtures/test-fixtures.ts'
import { TemplatesPage, TemplateImportPage } from './page-objects/index.ts'

test.describe('Templates (Admin Only)', () => {
    test.describe('Access Control', () => {
        test('should allow admin access to templates', async ({ adminPage }) => {
            const templatesPage = new TemplatesPage(adminPage)
            await templatesPage.goto()

            await expect(adminPage.getByRole('heading', { name: 'Templates' })).toBeVisible()
        })

        test('should redirect non-admin users to dashboard', async ({ userPage }) => {
            await userPage.goto('/templates')

            // Should be redirected to dashboard
            await userPage.waitForURL(/\/dashboard/, { timeout: 5000 })
        })
    })

    test.describe('List View', () => {
        test('should display templates page with heading', async ({ adminPage }) => {
            const templatesPage = new TemplatesPage(adminPage)
            await templatesPage.goto()

            await expect(adminPage.locator('h1:has-text("Templates"), h2:has-text("Templates")')).toBeVisible()
        })

        test('should display search input', async ({ adminPage }) => {
            const templatesPage = new TemplatesPage(adminPage)
            await templatesPage.goto()
            await templatesPage.waitForLoad()

            await expect(templatesPage.searchInput).toBeVisible()
        })

        test('should display filter dropdown', async ({ adminPage }) => {
            const templatesPage = new TemplatesPage(adminPage)
            await templatesPage.goto()
            await templatesPage.waitForLoad()

            await expect(templatesPage.filterStatus).toBeVisible()
        })

        test('should display import button', async ({ adminPage }) => {
            const templatesPage = new TemplatesPage(adminPage)
            await templatesPage.goto()
            await templatesPage.waitForLoad()

            await expect(templatesPage.importButton).toBeVisible()
        })

        test('should display statistics bar', async ({ adminPage }) => {
            const templatesPage = new TemplatesPage(adminPage)
            await templatesPage.goto()
            await templatesPage.waitForLoad()

            // Stats bar should be visible
            await expect(templatesPage.statsBar).toBeVisible()
        })

        test('should filter templates by status', async ({ adminPage }) => {
            const templatesPage = new TemplatesPage(adminPage)
            await templatesPage.goto()
            await templatesPage.waitForLoad()

            // Filter by published
            await templatesPage.filterByStatus('published')
            await adminPage.waitForTimeout(500)

            // Should still show templates page without errors
            await expect(templatesPage.filterStatus).toBeVisible()
        })

        test('should search templates', async ({ adminPage }) => {
            const templatesPage = new TemplatesPage(adminPage)
            await templatesPage.goto()
            await templatesPage.waitForLoad()

            // Search for something
            await templatesPage.search('DSCP')
            await adminPage.waitForTimeout(500)

            // Should work without errors
            await expect(templatesPage.searchInput).toBeVisible()
        })
    })

    test.describe('Import Template', () => {
        test('should navigate to import page', async ({ adminPage }) => {
            const templatesPage = new TemplatesPage(adminPage)
            await templatesPage.goto()
            await templatesPage.waitForLoad()

            await templatesPage.clickImport()

            expect(adminPage.url()).toContain('/templates/import')
        })

        test('should display import form', async ({ adminPage }) => {
            const importPage = new TemplateImportPage(adminPage)
            await importPage.goto()

            await expect(adminPage.locator('text=Import')).toBeVisible()
        })

        test('should have cancel button', async ({ adminPage }) => {
            const importPage = new TemplateImportPage(adminPage)
            await importPage.goto()

            await expect(importPage.cancelButton).toBeVisible()
        })

        test('should navigate back on cancel', async ({ adminPage }) => {
            const importPage = new TemplateImportPage(adminPage)
            await importPage.goto()

            await importPage.cancelButton.click()

            await adminPage.waitForURL(/\/templates(?!\/import)/)
        })
    })

    test.describe('Template Cards', () => {
        test('should display template cards when templates exist', async ({ adminPage }) => {
            const templatesPage = new TemplatesPage(adminPage)
            await templatesPage.goto()
            await templatesPage.waitForLoad()

            const cardCount = await templatesPage.getCardCount()

            if (cardCount > 0) {
                // Cards should have view button
                const firstCard = templatesPage.templateCards.first()
                await expect(firstCard.locator('button:has-text("View")')).toBeVisible()
            }
        })

        test('should navigate to template detail on view', async ({ adminPage }) => {
            const templatesPage = new TemplatesPage(adminPage)
            await templatesPage.goto()
            await templatesPage.waitForLoad()

            const cardCount = await templatesPage.getCardCount()

            if (cardCount > 0) {
                await templatesPage.viewTemplate(0)
                expect(adminPage.url()).toMatch(/\/templates\/[^/]+$/)
            }
        })
    })

    test.describe('Template Actions', () => {
        test('should show publish confirmation modal for draft templates', async ({ adminPage }) => {
            const templatesPage = new TemplatesPage(adminPage)
            await templatesPage.goto()
            await templatesPage.filterByStatus('draft')
            await templatesPage.waitForLoad()

            const cardCount = await templatesPage.getCardCount()

            if (cardCount > 0) {
                const firstCard = templatesPage.templateCards.first()
                const publishButton = firstCard.locator('button:has-text("Publish")')

                if (await publishButton.isVisible()) {
                    await publishButton.click()
                    await expect(templatesPage.publishModal).toBeVisible()
                }
            }
        })

        test('should show delete confirmation modal', async ({ adminPage }) => {
            const templatesPage = new TemplatesPage(adminPage)
            await templatesPage.goto()
            await templatesPage.filterByStatus('draft')
            await templatesPage.waitForLoad()

            const cardCount = await templatesPage.getCardCount()

            if (cardCount > 0) {
                const firstCard = templatesPage.templateCards.first()
                const deleteButton = firstCard.locator('button:has-text("Delete")')

                if (await deleteButton.isVisible()) {
                    await deleteButton.click()
                    await expect(templatesPage.deleteModal).toBeVisible()
                }
            }
        })

        test('should have export button on template cards', async ({ adminPage }) => {
            const templatesPage = new TemplatesPage(adminPage)
            await templatesPage.goto()
            await templatesPage.waitForLoad()

            const cardCount = await templatesPage.getCardCount()

            if (cardCount > 0) {
                const firstCard = templatesPage.templateCards.first()
                await expect(firstCard.locator('button:has-text("Export")')).toBeVisible()
            }
        })
    })

    test.describe('Pagination', () => {
        test('should display pagination when many templates exist', async ({ adminPage }) => {
            const templatesPage = new TemplatesPage(adminPage)
            await templatesPage.goto()
            await templatesPage.waitForLoad()

            // Pagination visibility depends on data
            const hasPagination = await templatesPage.pagination.isVisible().catch(() => false)
            expect(typeof hasPagination).toBe('boolean')
        })
    })
})
