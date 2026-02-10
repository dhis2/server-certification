import { Page, Locator } from '@playwright/test'
import { BasePage } from './base.page.ts'

/**
 * Implementations List Page Object
 */
export class ImplementationsPage extends BasePage {
    // Toolbar
    readonly searchInput: Locator
    readonly createButton: Locator

    // Table
    readonly dataTable: Locator
    readonly tableRows: Locator
    readonly emptyState: Locator

    // Pagination
    readonly pagination: Locator

    // Create modal
    readonly createModal: Locator
    readonly nameInput: Locator
    readonly countryInput: Locator
    readonly contactEmailInput: Locator
    readonly contactPhoneInput: Locator
    readonly descriptionInput: Locator
    readonly dhis2UrlInput: Locator
    readonly dhis2VersionInput: Locator
    readonly submitButton: Locator
    readonly cancelButton: Locator

    // Delete modal
    readonly deleteModal: Locator
    readonly confirmDeleteButton: Locator
    readonly cancelDeleteButton: Locator

    // Loading and error states
    readonly loadingSpinner: Locator
    readonly errorNotice: Locator
    readonly retryButton: Locator

    constructor(page: Page) {
        super(page)

        // Toolbar
        this.searchInput = page.locator('[data-test="search-implementations"] input, input[placeholder*="Search implementations"]')
        this.createButton = page.locator('[data-test="create-implementation"], button:has-text("Add Implementation")')

        // Table
        this.dataTable = page.locator('table')
        this.tableRows = page.locator('tbody tr')
        this.emptyState = page.locator('[class*="emptyState"]')

        // Pagination
        this.pagination = page.locator('[class*="pagination"]')

        // Create modal form inputs
        this.createModal = page.locator('[role="dialog"], [class*="Modal"]')
        this.nameInput = page.locator('input[name="name"]')
        this.countryInput = page.locator('input[name="country"]')
        this.contactEmailInput = page.locator('input[name="contactEmail"]')
        this.contactPhoneInput = page.locator('input[name="contactPhone"]')
        this.descriptionInput = page.locator('textarea[name="description"]')
        this.dhis2UrlInput = page.locator('input[name="dhis2InstanceUrl"]')
        this.dhis2VersionInput = page.locator('input[name="dhis2Version"]')
        this.submitButton = page.locator('[data-test="submit-implementation"], button[type="submit"]:has-text("Create")')
        this.cancelButton = page.locator('button:has-text("Cancel")')

        // Delete modal
        this.deleteModal = page.locator('[role="dialog"]:has-text("Delete Implementation")')
        this.confirmDeleteButton = page.locator('button:has-text("Delete")').last()
        this.cancelDeleteButton = this.deleteModal.locator('button:has-text("Cancel")')

        // Loading and error
        this.loadingSpinner = page.locator('[class*="loadingContainer"]')
        this.errorNotice = page.locator('[class*="NoticeBox"][class*="error"], [class*="error"]')
        this.retryButton = page.locator('button:has-text("Retry")')
    }

    async goto(): Promise<void> {
        // If already on the page, skip navigation
        if (this.page.url().includes('/implementations')) {
            await this.waitForTableLoad()
            return
        }

        // Use the sidebar nav link (more specific to avoid dashboard card links)
        // The sidebar nav is inside a <nav> element
        const sidebar = this.page.locator('nav')
        const navLink = sidebar.getByRole('link', { name: 'Implementations', exact: true })

        try {
            await navLink.waitFor({ state: 'visible', timeout: 10000 })
            await navLink.click()
            await this.page.waitForURL(/\/implementations/, { timeout: 10000 })
        } catch {
            // If nav link click fails, check if we're authenticated
            const currentUrl = this.page.url()
            if (currentUrl.includes('/login') || currentUrl === 'http://localhost:3000/') {
                throw new Error('Not authenticated - cannot navigate to implementations')
            }

            // Try clicking any implementations link on the page
            const anyImplLink = this.page.getByRole('link', { name: 'Implementations', exact: true }).first()
            await anyImplLink.click()
            await this.page.waitForURL(/\/implementations/, { timeout: 10000 })
        }

        await this.waitForTableLoad()
    }

    async waitForTableLoad(): Promise<void> {
        // Wait for either the data table or empty state to be visible
        await Promise.race([
            this.dataTable.waitFor({ state: 'visible', timeout: 15000 }),
            this.emptyState.waitFor({ state: 'visible', timeout: 15000 }),
            this.page.getByRole('heading', { name: /implementations/i }).waitFor({ state: 'visible', timeout: 15000 }),
        ])
    }

    async search(term: string): Promise<void> {
        await this.searchInput.fill(term)
        await this.page.waitForTimeout(300) // Debounce
    }

    async getRowCount(): Promise<number> {
        return this.tableRows.count()
    }

    async openCreateModal(): Promise<void> {
        await this.createButton.click()
        await this.createModal.waitFor({ state: 'visible' })
    }

    async fillImplementationForm(data: {
        name: string
        country?: string
        contactEmail?: string
        contactPhone?: string
        description?: string
        dhis2InstanceUrl?: string
        dhis2Version?: string
    }): Promise<void> {
        await this.nameInput.fill(data.name)
        if (data.country) {
            await this.countryInput.fill(data.country)
        }
        if (data.contactEmail) {
            await this.contactEmailInput.fill(data.contactEmail)
        }
        if (data.contactPhone) {
            await this.contactPhoneInput.fill(data.contactPhone)
        }
        if (data.description) {
            await this.descriptionInput.fill(data.description)
        }
        if (data.dhis2InstanceUrl) {
            await this.dhis2UrlInput.fill(data.dhis2InstanceUrl)
        }
        if (data.dhis2Version) {
            await this.dhis2VersionInput.fill(data.dhis2Version)
        }
    }

    async submitForm(): Promise<void> {
        await this.submitButton.click()
    }

    async createImplementation(data: {
        name: string
        country?: string
        contactEmail?: string
        contactPhone?: string
        description?: string
        dhis2InstanceUrl?: string
        dhis2Version?: string
    }): Promise<void> {
        await this.openCreateModal()
        await this.fillImplementationForm(data)
        await this.submitForm()

        // Wait for either: modal closes (success) OR error alert appears
        const modalHidden = this.createModal.waitFor({ state: 'hidden', timeout: 15000 })
        const errorAlert = this.page.getByRole('alert').waitFor({ state: 'visible', timeout: 15000 })

        try {
            await Promise.race([modalHidden, errorAlert])
        } catch {
            // Timeout - check if there's an error displayed
            const hasError = await this.page.getByRole('alert').isVisible().catch(() => false)
            if (hasError) {
                const errorText = await this.page.getByRole('alert').textContent()
                throw new Error(`Failed to create implementation: ${errorText}`)
            }
            throw new Error('Failed to create implementation: modal did not close')
        }

        // Check if modal is still visible (error case)
        const modalStillVisible = await this.createModal.isVisible().catch(() => false)
        if (modalStillVisible) {
            const errorText = await this.page.getByRole('alert').textContent().catch(() => 'Unknown error')
            throw new Error(`Failed to create implementation: ${errorText}`)
        }
    }

    async viewImplementation(rowIndex: number): Promise<void> {
        const row = this.tableRows.nth(rowIndex)
        await row.locator('button:has-text("View")').click()
        await this.page.waitForURL(/\/implementations\/[^/]+$/)
    }

    async deleteImplementation(rowIndex: number): Promise<void> {
        const row = this.tableRows.nth(rowIndex)
        await row.locator('button:has-text("Delete")').click()
        await this.deleteModal.waitFor({ state: 'visible' })
        await this.confirmDeleteButton.click()
        await this.deleteModal.waitFor({ state: 'hidden', timeout: 10000 })
    }

    async getImplementationNames(): Promise<string[]> {
        const names: string[] = []
        const rows = await this.tableRows.all()
        for (const row of rows) {
            const nameCell = row.locator('td').first()
            const text = await nameCell.textContent()
            if (text) {
                names.push(text.trim())
            }
        }
        return names
    }

    async hasImplementation(name: string): Promise<boolean> {
        const names = await this.getImplementationNames()
        return names.some((n) => n.includes(name))
    }
}
