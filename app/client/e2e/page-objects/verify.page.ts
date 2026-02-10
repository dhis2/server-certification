import { Page, Locator } from '@playwright/test'
import { BasePage } from './base.page.ts'

/**
 * Verify Certificate Page Object
 * This is a public page (no authentication required)
 */
export class VerifyCertificatePage extends BasePage {
    // Header
    readonly pageTitle: Locator

    // Loading state
    readonly loadingSpinner: Locator
    readonly loadingText: Locator

    // Valid certificate result
    readonly validResult: Locator
    readonly validStatusIcon: Locator
    readonly validStatusTitle: Locator

    // Certificate details
    readonly implementationName: Locator
    readonly certificateNumber: Locator
    readonly controlGroup: Locator
    readonly score: Locator
    readonly validFrom: Locator
    readonly validUntil: Locator

    // Verification checks
    readonly checksSection: Locator
    readonly checkItems: Locator

    // Invalid certificate result
    readonly invalidResult: Locator
    readonly invalidStatusIcon: Locator
    readonly invalidStatusTitle: Locator

    // Error state
    readonly errorNotice: Locator

    // Footer
    readonly footer: Locator

    constructor(page: Page) {
        super(page)

        // Header
        this.pageTitle = page.locator('h1')

        // Loading
        this.loadingSpinner = page.locator('[class*="loadingContainer"]')
        this.loadingText = page.locator('text=Verifying certificate')

        // Valid result
        this.validResult = page.locator('[data-test="verification-valid"], [class*="validResult"]')
        this.validStatusIcon = this.validResult.locator('[class*="statusIcon"]')
        this.validStatusTitle = this.validResult.locator('h2')

        // Certificate details
        this.implementationName = page.locator('text=Implementation').locator('..').locator('[class*="detailValue"]')
        this.certificateNumber = page.locator('text=Certificate Number').locator('..').locator('[class*="detailValue"]')
        this.controlGroup = page.locator('text=Control Group').locator('..').locator('[class*="detailValue"]')
        this.score = page.locator('text=Score').locator('..').locator('[class*="detailValue"]')
        this.validFrom = page.locator('text=Valid From').locator('..').locator('[class*="detailValue"]')
        this.validUntil = page.locator('text=Valid Until').locator('..').locator('[class*="detailValue"]')

        // Verification checks
        this.checksSection = page.locator('[class*="checksSection"]')
        this.checkItems = page.locator('[class*="checkItem"], [class*="checkItemFailed"]')

        // Invalid result
        this.invalidResult = page.locator('[data-test="verification-invalid"], [class*="invalidResult"]')
        this.invalidStatusIcon = this.invalidResult.locator('[class*="statusIconInvalid"]')
        this.invalidStatusTitle = this.invalidResult.locator('h2')

        // Error
        this.errorNotice = page.locator('[class*="NoticeBox"][class*="error"]')

        // Footer
        this.footer = page.locator('[class*="footer"]')
    }

    async goto(code: string): Promise<void> {
        await this.page.goto(`/verify/${code}`)
        await this.waitForPageLoad()
    }

    async waitForResult(): Promise<void> {
        await Promise.race([
            this.validResult.waitFor({ state: 'visible', timeout: 15000 }),
            this.invalidResult.waitFor({ state: 'visible', timeout: 15000 }),
            this.errorNotice.waitFor({ state: 'visible', timeout: 15000 }),
        ])
    }

    async isValid(): Promise<boolean> {
        return this.validResult.isVisible()
    }

    async isInvalid(): Promise<boolean> {
        return this.invalidResult.isVisible()
    }

    async hasError(): Promise<boolean> {
        return this.errorNotice.isVisible()
    }

    async getErrorMessage(): Promise<string | null> {
        if (await this.hasError()) {
            return this.errorNotice.textContent()
        }
        return null
    }

    async getCertificateDetails(): Promise<{
        implementation: string | null
        certificateNumber: string | null
        controlGroup: string | null
        score: string | null
        validFrom: string | null
        validUntil: string | null
    }> {
        return {
            implementation: await this.implementationName.textContent().catch(() => null),
            certificateNumber: await this.certificateNumber.textContent().catch(() => null),
            controlGroup: await this.controlGroup.textContent().catch(() => null),
            score: await this.score.textContent().catch(() => null),
            validFrom: await this.validFrom.textContent().catch(() => null),
            validUntil: await this.validUntil.textContent().catch(() => null),
        }
    }

    async getVerificationChecks(): Promise<string[]> {
        const checks: string[] = []
        const items = await this.checkItems.all()
        for (const item of items) {
            const text = await item.textContent()
            if (text) {
                checks.push(text.trim())
            }
        }
        return checks
    }
}
