import { Page, Locator } from '@playwright/test'
import { BasePage } from './base.page.ts'

/**
 * Templates List Page Object (Admin only)
 */
export class TemplatesPage extends BasePage {
    // Toolbar
    readonly searchInput: Locator
    readonly filterStatus: Locator
    readonly importButton: Locator

    // Statistics bar
    readonly statsBar: Locator
    readonly totalCount: Locator
    readonly publishedCount: Locator
    readonly draftCount: Locator

    // Templates grid
    readonly templatesGrid: Locator
    readonly templateCards: Locator
    readonly emptyState: Locator

    // Pagination
    readonly pagination: Locator

    // Loading and error states
    readonly loadingSpinner: Locator
    readonly errorNotice: Locator
    readonly retryButton: Locator

    // Publish modal
    readonly publishModal: Locator
    readonly confirmPublishButton: Locator

    // Delete modal
    readonly deleteModal: Locator
    readonly confirmDeleteButton: Locator

    constructor(page: Page) {
        super(page)

        // Toolbar
        this.searchInput = page.locator('[data-test="search-templates"] input, input[placeholder*="Search templates"]')
        // DHIS2 SingleSelectField with CSS class filterWrapper
        this.filterStatus = page.locator('[class*="filterWrapper"]')
        this.importButton = page.locator('[data-test="import-template"], button:has-text("Import Template")')

        // Stats
        this.statsBar = page.locator('[class*="statsBar"]')
        this.totalCount = this.statsBar.locator('text=Total').locator('..').locator('[class*="statValue"]')
        this.publishedCount = this.statsBar.locator('text=Published').locator('..').locator('[class*="statValue"]')
        this.draftCount = this.statsBar.locator('text=Drafts').locator('..').locator('[class*="statValue"]')

        // Grid
        this.templatesGrid = page.locator('[class*="templatesGrid"]')
        this.templateCards = page.locator('[class*="templateCard"], [class*="TemplateCard"]')
        this.emptyState = page.locator('[class*="emptyState"]')

        // Pagination
        this.pagination = page.locator('[class*="pagination"]')

        // Loading and error
        this.loadingSpinner = page.locator('[class*="loadingContainer"]')
        this.errorNotice = page.locator('[class*="NoticeBox"][class*="error"]')
        this.retryButton = page.locator('button:has-text("Retry")')

        // Modals
        this.publishModal = page.locator('[role="dialog"]:has-text("Publish Template")')
        this.confirmPublishButton = this.publishModal.locator('button:has-text("Publish")')
        this.deleteModal = page.locator('[role="dialog"]:has-text("Delete Template")')
        this.confirmDeleteButton = this.deleteModal.locator('button:has-text("Delete")')
    }

    async goto(): Promise<void> {
        if (this.page.url().endsWith('/templates') || this.page.url().includes('/templates?')) {
            await this.waitForLoad()
            return
        }

        // Use sidebar navigation to preserve auth context
        const sidebar = this.page.locator('nav')
        const navLink = sidebar.getByRole('link', { name: 'Templates', exact: true })

        try {
            await navLink.waitFor({ state: 'visible', timeout: 10000 })
            await navLink.click()
            await this.page.waitForURL(/\/templates/, { timeout: 10000 })
        } catch {
            // Check if we're authenticated
            const currentUrl = this.page.url()
            if (currentUrl.includes('/login') || currentUrl === 'http://localhost:3000/') {
                throw new Error('Not authenticated - cannot navigate to templates')
            }

            // Fallback to direct navigation
            await this.page.goto('/templates')
        }

        await this.waitForLoad()
    }

    async waitForLoad(): Promise<void> {
        await Promise.race([this.templatesGrid.waitFor({ state: 'visible', timeout: 10000 }), this.emptyState.waitFor({ state: 'visible', timeout: 10000 })])
    }

    async search(term: string): Promise<void> {
        await this.searchInput.fill(term)
        await this.page.waitForTimeout(400) // Debounce
    }

    async filterByStatus(status: 'all' | 'published' | 'draft'): Promise<void> {
        const labelMap = {
            all: 'All Templates',
            published: 'Published',
            draft: 'Drafts',
        }

        // Click the filter dropdown
        await this.filterStatus.click()

        // DHIS2 SingleSelectField renders options in a detached layer
        const optionText = labelMap[status]

        try {
            // Try DHIS2 menu wrapper first
            const option = this.page.locator('[data-test="dhis2-uicore-select-menu-menuwrapper"]').getByText(optionText, { exact: true })
            await option.waitFor({ state: 'visible', timeout: 3000 })
            await option.click()
        } catch {
            // Fallback: find the last matching text element (dropdown options are at end of DOM)
            await this.page.getByText(optionText, { exact: true }).last().click()
        }

        // Wait for content to update
        await this.waitForLoad()
    }

    async getCardCount(): Promise<number> {
        return this.templateCards.count()
    }

    async clickImport(): Promise<void> {
        await this.importButton.click()
        await this.page.waitForURL(/\/templates\/import/)
    }

    async viewTemplate(index: number): Promise<void> {
        const card = this.templateCards.nth(index)
        await card.locator('button:has-text("View")').click()
        await this.page.waitForURL(/\/templates\/[^/]+$/)
    }

    async exportTemplate(index: number): Promise<void> {
        const card = this.templateCards.nth(index)
        await card.locator('button:has-text("Export")').click()
    }

    async publishTemplate(index: number): Promise<void> {
        const card = this.templateCards.nth(index)
        await card.locator('button:has-text("Publish")').click()
        await this.publishModal.waitFor({ state: 'visible' })
        await this.confirmPublishButton.click()
        await this.publishModal.waitFor({ state: 'hidden', timeout: 10000 })
    }

    async deleteTemplate(index: number): Promise<void> {
        const card = this.templateCards.nth(index)
        await card.locator('button:has-text("Delete")').click()
        await this.deleteModal.waitFor({ state: 'visible' })
        await this.confirmDeleteButton.click()
        await this.deleteModal.waitFor({ state: 'hidden', timeout: 10000 })
    }
}

/**
 * Template Import Page Object
 */
export class TemplateImportPage extends BasePage {
    // Form elements
    readonly formatSelect: Locator
    readonly fileInput: Locator
    readonly textEditor: Locator
    readonly previewButton: Locator
    readonly importButton: Locator
    readonly cancelButton: Locator

    // Preview
    readonly previewSection: Locator
    readonly diffViewer: Locator

    // Validation
    readonly validationErrors: Locator
    readonly successMessage: Locator

    constructor(page: Page) {
        super(page)

        // Form
        this.formatSelect = page.locator('[data-test="format-select"]')
        this.fileInput = page.locator('input[type="file"]')
        this.textEditor = page.locator('textarea[name="content"], [class*="editor"] textarea')
        this.previewButton = page.locator('button:has-text("Preview")')
        this.importButton = page.locator('button:has-text("Import")')
        this.cancelButton = page.locator('button:has-text("Cancel"), button:has-text("Back to Templates")')

        // Preview
        this.previewSection = page.locator('[class*="preview"]')
        this.diffViewer = page.locator('[class*="diff"]')

        // Validation
        this.validationErrors = page.locator('[class*="validationError"], [class*="error"]')
        this.successMessage = page.locator('[class*="success"]')
    }

    async goto(): Promise<void> {
        if (this.page.url().includes('/templates/import')) {
            await this.waitForPageLoad()
            return
        }

        // Navigate via templates page to preserve auth context
        const sidebar = this.page.locator('nav')
        const navLink = sidebar.getByRole('link', { name: 'Templates', exact: true })

        try {
            await navLink.waitFor({ state: 'visible', timeout: 10000 })
            await navLink.click()
            await this.page.waitForURL(/\/templates/, { timeout: 10000 })

            // Then click Import button
            const importButton = this.page.locator('[data-test="import-template"], button:has-text("Import Template")')
            await importButton.waitFor({ state: 'visible', timeout: 10000 })
            await importButton.click()
            await this.page.waitForURL(/\/templates\/import/, { timeout: 10000 })
        } catch {
            // Check if we're authenticated
            const currentUrl = this.page.url()
            if (currentUrl.includes('/login') || currentUrl === 'http://localhost:3000/') {
                throw new Error('Not authenticated - cannot navigate to template import')
            }

            // Fallback to direct navigation
            await this.page.goto('/templates/import')
        }

        await this.waitForPageLoad()
    }

    async selectFormat(format: 'yaml' | 'json'): Promise<void> {
        await this.formatSelect.click()
        await this.page.locator(`text="${format.toUpperCase()}"`).click()
    }

    async uploadFile(filePath: string): Promise<void> {
        await this.fileInput.setInputFiles(filePath)
    }

    async enterContent(content: string): Promise<void> {
        await this.textEditor.fill(content)
    }

    async preview(): Promise<void> {
        await this.previewButton.click()
        await this.page.waitForTimeout(500)
    }

    async import(): Promise<void> {
        await this.importButton.click()
    }
}
