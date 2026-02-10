import { Page, expect } from '@playwright/test'

/**
 * Base Page Object class
 * @see https://playwright.dev/docs/pom
 */
export abstract class BasePage {
    constructor(protected readonly page: Page) {}

    /**
     * Navigate to the page
     */
    abstract goto(): Promise<void>

    /**
     * Wait for the page to be fully loaded
     * Uses domcontentloaded instead of deprecated networkidle
     */
    async waitForPageLoad(): Promise<void> {
        await this.page.waitForLoadState('domcontentloaded')
    }

    /**
     * Wait for authenticated content to be ready
     * This ensures we're not on the login page
     */
    async waitForAuthenticatedContent(): Promise<void> {
        // Wait for either the sidebar (authenticated) or login form (unauthenticated)
        const sidebar = this.page.locator('[class*="sidebar"], nav[aria-label]')
        const loginForm = this.page.locator('input[name="email"]')

        // Wait for one of them to be visible
        await Promise.race([
            sidebar.waitFor({ state: 'visible', timeout: 10000 }),
            loginForm.waitFor({ state: 'visible', timeout: 10000 }),
        ])

        // If we see the login form, we've lost authentication
        const isLoginVisible = await loginForm.isVisible().catch(() => false)
        if (isLoginVisible) {
            throw new Error('Authentication lost - redirected to login page')
        }
    }

    /**
     * Get page title
     */
    async getTitle(): Promise<string> {
        return this.page.title()
    }

    /**
     * Get current URL
     */
    getUrl(): string {
        return this.page.url()
    }

    /**
     * Wait for navigation to complete
     */
    async waitForNavigation(): Promise<void> {
        await this.page.waitForLoadState('load')
    }

    /**
     * Take a screenshot
     */
    async screenshot(name: string): Promise<void> {
        await this.page.screenshot({ path: `screenshots/${name}.png` })
    }
}
