import { Page, Locator } from '@playwright/test'
import { BasePage } from './base.page.ts'

/**
 * Login Page Object
 * Encapsulates interactions with the login page
 */
export class LoginPage extends BasePage {
    // Form elements
    readonly usernameInput: Locator
    readonly passwordInput: Locator
    readonly submitButton: Locator

    // Error elements
    readonly errorMessage: Locator

    constructor(page: Page) {
        super(page)
        this.usernameInput = page.locator('input[name="username"], input[type="email"], #username')
        this.passwordInput = page.locator('input[name="password"], #password')
        this.submitButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")')
        this.errorMessage = page.locator('[role="alert"], .error-message, [data-test="error"]')
    }

    async goto(): Promise<void> {
        await this.page.goto('/')
        await this.waitForPageLoad()
    }

    async login(username: string, password: string): Promise<void> {
        await this.usernameInput.fill(username)
        await this.passwordInput.fill(password)
        await this.submitButton.click()
    }

    async isLoginFormVisible(): Promise<boolean> {
        return (await this.usernameInput.isVisible()) && (await this.passwordInput.isVisible())
    }

    async hasError(): Promise<boolean> {
        return this.errorMessage.isVisible()
    }

    async getErrorMessage(): Promise<string | null> {
        if (await this.hasError()) {
            return this.errorMessage.textContent()
        }
        return null
    }
}
