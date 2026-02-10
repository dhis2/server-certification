import { Page, Locator } from '@playwright/test'
import { BasePage } from './base.page.ts'

/**
 * Settings Page Object
 */
export class SettingsPage extends BasePage {
    // Tab navigation
    readonly securityTab: Locator
    readonly profileTab: Locator
    readonly preferencesTab: Locator

    // Security section - TFA
    readonly tfaSection: Locator
    readonly enableTfaButton: Locator
    readonly disableTfaButton: Locator
    readonly tfaQrCode: Locator
    readonly tfaSecretKey: Locator
    readonly tfaCodeInput: Locator
    readonly verifyTfaButton: Locator
    readonly recoveryCodes: Locator
    readonly regenerateCodesButton: Locator

    // Profile section
    readonly firstNameInput: Locator
    readonly lastNameInput: Locator
    readonly emailDisplay: Locator
    readonly saveProfileButton: Locator

    // Password change
    readonly currentPasswordInput: Locator
    readonly newPasswordInput: Locator
    readonly confirmPasswordInput: Locator
    readonly changePasswordButton: Locator

    // Notices and errors
    readonly successNotice: Locator
    readonly errorNotice: Locator

    constructor(page: Page) {
        super(page)

        // Tabs
        this.securityTab = page.locator('button:has-text("Security")')
        this.profileTab = page.locator('button:has-text("Profile")')
        this.preferencesTab = page.locator('button:has-text("Preferences")')

        // TFA elements
        this.tfaSection = page.locator('[class*="tfaSection"], [class*="TwoFactor"]')
        this.enableTfaButton = page.locator('button:has-text("Enable Two-Factor"), button:has-text("Set Up")')
        this.disableTfaButton = page.locator('button:has-text("Disable Two-Factor"), button:has-text("Disable")')
        this.tfaQrCode = page.locator('[class*="qrCode"] img, img[alt*="QR"]')
        this.tfaSecretKey = page.locator('[class*="secretKey"]')
        this.tfaCodeInput = page.locator('input[name="tfaCode"], input[placeholder*="code"]')
        this.verifyTfaButton = page.locator('button:has-text("Verify"), button:has-text("Enable")')
        this.recoveryCodes = page.locator('[class*="recoveryCodes"]')
        this.regenerateCodesButton = page.locator('button:has-text("Regenerate")')

        // Profile elements
        this.firstNameInput = page.locator('input[name="firstName"]')
        this.lastNameInput = page.locator('input[name="lastName"]')
        this.emailDisplay = page.locator('[class*="emailDisplay"], text=Email').locator('..')
        this.saveProfileButton = page.locator('button:has-text("Save"), button:has-text("Update Profile")')

        // Password change
        this.currentPasswordInput = page.locator('input[name="currentPassword"]')
        this.newPasswordInput = page.locator('input[name="newPassword"]')
        this.confirmPasswordInput = page.locator('input[name="confirmPassword"]')
        this.changePasswordButton = page.locator('button:has-text("Change Password")')

        // Notices
        this.successNotice = page.locator('[class*="success"], [role="alert"]:has-text("success")')
        this.errorNotice = page.locator('[class*="error"], [role="alert"]:has-text("error")')
    }

    async goto(): Promise<void> {
        if (this.page.url().includes('/settings')) {
            await this.waitForPageLoad()
            return
        }

        // Use sidebar navigation to preserve auth context
        const sidebar = this.page.locator('nav')
        const navLink = sidebar.getByRole('link', { name: 'Settings', exact: true })

        try {
            await navLink.waitFor({ state: 'visible', timeout: 10000 })
            await navLink.click()
            await this.page.waitForURL(/\/settings/, { timeout: 10000 })
        } catch {
            // Check if we're authenticated
            const currentUrl = this.page.url()
            if (currentUrl.includes('/login') || currentUrl === 'http://localhost:3000/') {
                throw new Error('Not authenticated - cannot navigate to settings')
            }

            // Fallback to direct navigation
            await this.page.goto('/settings')
        }

        await this.waitForPageLoad()
    }

    async gotoSecurityTab(): Promise<void> {
        await this.goto()
        await this.switchToTab('security')
    }

    async gotoProfileTab(): Promise<void> {
        await this.goto()
        await this.switchToTab('profile')
    }

    async switchToTab(tab: 'security' | 'profile' | 'preferences'): Promise<void> {
        const tabMap = {
            security: this.securityTab,
            profile: this.profileTab,
            preferences: this.preferencesTab,
        }
        await tabMap[tab].click()
        await this.page.waitForTimeout(300)
    }

    async updateProfile(data: { firstName?: string; lastName?: string }): Promise<void> {
        if (data.firstName) {
            await this.firstNameInput.fill(data.firstName)
        }
        if (data.lastName) {
            await this.lastNameInput.fill(data.lastName)
        }
        await this.saveProfileButton.click()
    }

    async changePassword(currentPassword: string, newPassword: string): Promise<void> {
        await this.currentPasswordInput.fill(currentPassword)
        await this.newPasswordInput.fill(newPassword)
        await this.confirmPasswordInput.fill(newPassword)
        await this.changePasswordButton.click()
    }

    async isTfaEnabled(): Promise<boolean> {
        return this.disableTfaButton.isVisible()
    }
}
