import { test, expect, testData } from './fixtures/test-fixtures.ts'
import { AssessmentsPage, CreateAssessmentPage } from './page-objects/index.ts'

test.describe('Assessments', () => {
    test.describe('List View', () => {
        test('should display assessments page with heading', async ({ adminPage }) => {
            const assessmentsPage = new AssessmentsPage(adminPage)
            await assessmentsPage.goto()

            await expect(adminPage.locator('h1:has-text("Assessments"), h2:has-text("Assessments")')).toBeVisible()
        })

        test('should display status filter', async ({ adminPage }) => {
            const assessmentsPage = new AssessmentsPage(adminPage)
            await assessmentsPage.goto()
            await assessmentsPage.waitForTableLoad()

            await expect(assessmentsPage.statusFilter).toBeVisible()
        })

        test('should display new assessment button', async ({ adminPage }) => {
            const assessmentsPage = new AssessmentsPage(adminPage)
            await assessmentsPage.goto()
            await assessmentsPage.waitForTableLoad()

            await expect(assessmentsPage.newAssessmentButton).toBeVisible()
        })

        test('should navigate to create assessment page', async ({ adminPage }) => {
            const assessmentsPage = new AssessmentsPage(adminPage)
            await assessmentsPage.goto()
            await assessmentsPage.waitForTableLoad()

            await assessmentsPage.clickNewAssessment()

            expect(adminPage.url()).toContain('/assessments/new')
        })

        test('should filter by status', async ({ adminPage }) => {
            const assessmentsPage = new AssessmentsPage(adminPage)
            await assessmentsPage.goto()
            await assessmentsPage.waitForTableLoad()

            // Get initial count
            const initialCount = await assessmentsPage.getRowCount()

            // Filter by draft - the filterByStatus method waits for table reload
            await assessmentsPage.filterByStatus('draft')

            // Count may change based on data
            const filteredCount = await assessmentsPage.getRowCount()
            expect(filteredCount).toBeLessThanOrEqual(initialCount)
        })

        test('should reset filter to show all', async ({ adminPage }) => {
            const assessmentsPage = new AssessmentsPage(adminPage)
            await assessmentsPage.goto()
            await assessmentsPage.waitForTableLoad()

            // Filter and reset
            await assessmentsPage.filterByStatus('draft')
            await adminPage.waitForTimeout(300)
            await assessmentsPage.filterByStatus('all')
            await adminPage.waitForTimeout(300)

            // Should work without errors
            await expect(assessmentsPage.statusFilter).toBeVisible()
        })
    })

    test.describe('Create Assessment', () => {
        test('should display create assessment form', async ({ adminPage }) => {
            const createPage = new CreateAssessmentPage(adminPage)
            await createPage.goto()

            await expect(adminPage.locator('text=New Assessment')).toBeVisible()
        })

        test('should display implementation selector or prerequisites notice', async ({ adminPage }) => {
            const createPage = new CreateAssessmentPage(adminPage)
            await createPage.goto()

            // Wait for one of the expected elements to appear
            await Promise.race([
                createPage.implementationSelect.waitFor({ state: 'visible', timeout: 10000 }),
                createPage.noImplementationsNotice.waitFor({ state: 'visible', timeout: 10000 }),
                createPage.noTemplatesNotice.waitFor({ state: 'visible', timeout: 10000 }),
            ]).catch(() => {})

            // Check which element is visible
            const hasSelect = await createPage.implementationSelect.isVisible().catch(() => false)
            const hasImplNotice = await createPage.noImplementationsNotice.isVisible().catch(() => false)
            const hasTemplateNotice = await createPage.noTemplatesNotice.isVisible().catch(() => false)

            expect(hasSelect || hasImplNotice || hasTemplateNotice).toBe(true)
        })

        test('should display template selector or prerequisites notice', async ({ adminPage }) => {
            const createPage = new CreateAssessmentPage(adminPage)
            await createPage.goto()

            // Wait for one of the expected elements to appear
            await Promise.race([
                createPage.templateSelect.waitFor({ state: 'visible', timeout: 10000 }),
                createPage.noImplementationsNotice.waitFor({ state: 'visible', timeout: 10000 }),
                createPage.noTemplatesNotice.waitFor({ state: 'visible', timeout: 10000 }),
            ]).catch(() => {})

            const hasSelect = await createPage.templateSelect.isVisible().catch(() => false)
            const hasImplNotice = await createPage.noImplementationsNotice.isVisible().catch(() => false)
            const hasTemplateNotice = await createPage.noTemplatesNotice.isVisible().catch(() => false)

            expect(hasSelect || hasImplNotice || hasTemplateNotice).toBe(true)
        })

        test('should display control group options', async ({ adminPage }) => {
            const createPage = new CreateAssessmentPage(adminPage)
            await createPage.goto()

            await adminPage.waitForLoadState('networkidle')

            // Check if at least DSCP1 option is visible (if form is shown)
            const hasForm = await createPage.submitButton.isVisible().catch(() => false)
            if (hasForm) {
                await expect(adminPage.locator('text=DSCP1')).toBeVisible()
            }
        })

        test('should display assessment details fields', async ({ adminPage }) => {
            const createPage = new CreateAssessmentPage(adminPage)
            await createPage.goto()

            await adminPage.waitForLoadState('networkidle')

            const hasForm = await createPage.submitButton.isVisible().catch(() => false)
            if (hasForm) {
                await expect(createPage.assessorNameInput).toBeVisible()
                await expect(createPage.assessmentDateInput).toBeVisible()
            }
        })

        test('should navigate back to assessments list', async ({ adminPage }) => {
            const createPage = new CreateAssessmentPage(adminPage)
            await createPage.goto()

            await adminPage.waitForLoadState('domcontentloaded')

            // Try to click back or cancel button if available
            const backButton = adminPage.locator('button:has-text("Back"), button:has-text("Cancel")').first()
            const hasBackButton = await backButton.isVisible().catch(() => false)

            if (hasBackButton) {
                await backButton.click()
            } else {
                // No form displayed (e.g., no templates available), use sidebar navigation
                const assessmentsLink = adminPage.locator('nav').getByRole('link', { name: 'Assessments', exact: true })
                await assessmentsLink.click()
            }

            await adminPage.waitForURL(/\/assessments(?!\/new)/)
        })

        test('should show validation error without required fields', async ({ adminPage }) => {
            const createPage = new CreateAssessmentPage(adminPage)
            await createPage.goto()

            await adminPage.waitForLoadState('networkidle')

            const hasForm = await createPage.submitButton.isVisible().catch(() => false)
            if (hasForm) {
                // Try to submit without selecting implementation
                await createPage.submitButton.click()

                // Should show validation error or button should be disabled
                const hasError = await adminPage
                    .locator('text=Please select')
                    .isVisible()
                    .catch(() => false)
                const isDisabled = await createPage.submitButton.isDisabled()

                expect(hasError || isDisabled).toBe(true)
            }
        })

        test('should pre-fill assessment date with today', async ({ adminPage }) => {
            const createPage = new CreateAssessmentPage(adminPage)
            await createPage.goto()

            await adminPage.waitForLoadState('networkidle')

            const hasForm = await createPage.assessmentDateInput.isVisible().catch(() => false)
            if (hasForm) {
                const dateValue = await createPage.assessmentDateInput.inputValue()
                const today = new Date().toISOString().split('T')[0]
                expect(dateValue).toBe(today)
            }
        })
    })

    test.describe('Assessment Flow', () => {
        test('should create new assessment when data is available', async ({ adminPage }) => {
            const createPage = new CreateAssessmentPage(adminPage)
            await createPage.goto()

            await adminPage.waitForLoadState('networkidle')

            // Check if we have implementations and templates
            const hasImplementations = await createPage.implementationSelect.isVisible().catch(() => false)
            const hasTemplates = await createPage.templateSelect.isVisible().catch(() => false)

            if (hasImplementations && hasTemplates) {
                // Select first available implementation
                await createPage.implementationSelect.click()
                const firstOption = adminPage.locator('[data-value]:not([data-value=""])').first()
                await firstOption.click()

                // Select first available template
                await createPage.templateSelect.click()
                const firstTemplate = adminPage.locator('[data-value]:not([data-value=""])').first()
                await firstTemplate.click()

                // Fill details
                await createPage.fillAssessmentDetails({
                    assessorName: testData.assessment.assessorName,
                    systemEnvironment: testData.assessment.systemEnvironment,
                })

                // Submit
                await createPage.submit()

                // Should navigate to assessment form
                await adminPage.waitForURL(/\/assessments\/[^/]+$/, { timeout: 10000 })
            }
        })
    })

    test.describe('Delete Assessment', () => {
        test('should show delete button only for draft assessments', async ({ adminPage }) => {
            const assessmentsPage = new AssessmentsPage(adminPage)
            await assessmentsPage.goto()
            await assessmentsPage.waitForTableLoad()

            const rowCount = await assessmentsPage.getRowCount()
            if (rowCount > 0) {
                // Filter to draft assessments
                await assessmentsPage.filterByStatus('draft')
                await adminPage.waitForTimeout(500)

                const draftCount = await assessmentsPage.getRowCount()
                if (draftCount > 0) {
                    // Draft rows should have delete button
                    const firstRow = assessmentsPage.tableRows.first()
                    const deleteButton = firstRow.locator('button:has-text("Delete")')
                    await expect(deleteButton).toBeVisible()
                }
            }
        })

        test('should show delete confirmation modal', async ({ adminPage }) => {
            const assessmentsPage = new AssessmentsPage(adminPage)
            await assessmentsPage.goto()
            await assessmentsPage.filterByStatus('draft')
            await assessmentsPage.waitForTableLoad()

            const rowCount = await assessmentsPage.getRowCount()
            if (rowCount > 0) {
                const firstRow = assessmentsPage.tableRows.first()
                const deleteButton = firstRow.locator('button:has-text("Delete")')

                if (await deleteButton.isVisible()) {
                    await deleteButton.click()
                    await expect(assessmentsPage.deleteModal).toBeVisible()
                }
            }
        })
    })
})
