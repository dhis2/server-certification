import { Page, Locator } from '@playwright/test'
import { BasePage } from './base.page.ts'

/**
 * Home/Dashboard Page Object
 * Encapsulates interactions with the main landing page
 */
export class HomePage extends BasePage {
    // Locators
    readonly mainContent: Locator
    readonly header: Locator
    readonly navigation: Locator

    constructor(page: Page) {
        super(page)
        this.mainContent = page.locator('main, [role="main"], #root')
        this.header = page.locator('header, [role="banner"]')
        this.navigation = page.locator('nav, [role="navigation"]')
    }

    async goto(): Promise<void> {
        await this.page.goto('/')
        await this.waitForPageLoad()
    }

    async isLoaded(): Promise<boolean> {
        try {
            await this.mainContent.waitFor({ state: 'visible', timeout: 10000 })
            return true
        } catch {
            return false
        }
    }

    async hasNavigation(): Promise<boolean> {
        return this.navigation.isVisible()
    }

    async hasHeader(): Promise<boolean> {
        return this.header.isVisible()
    }
}
