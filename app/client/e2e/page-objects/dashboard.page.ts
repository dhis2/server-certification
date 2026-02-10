import { Page, Locator } from '@playwright/test'
import { BasePage } from './base.page.ts'

/**
 * Dashboard Page Object
 * Encapsulates interactions with the main dashboard
 */
export class DashboardPage extends BasePage {
    // Header elements
    readonly welcomeMessage: Locator
    readonly userEmail: Locator
    readonly userRole: Locator

    // Navigation cards
    readonly implementationsCard: Locator
    readonly assessmentsCard: Locator
    readonly templatesCard: Locator
    readonly usersCard: Locator
    readonly monitoringCard: Locator
    readonly certificatesCard: Locator

    // Account status
    readonly accountStatusCard: Locator
    readonly tfaStatus: Locator

    // Sidebar navigation
    readonly dashboardNav: Locator
    readonly implementationsNav: Locator
    readonly assessmentsNav: Locator
    readonly templatesNav: Locator
    readonly usersNav: Locator
    readonly certificatesNav: Locator
    readonly monitoringNav: Locator
    readonly auditNav: Locator
    readonly keysNav: Locator
    readonly settingsNav: Locator
    readonly logoutButton: Locator

    constructor(page: Page) {
        super(page)

        // Welcome section
        this.welcomeMessage = page.locator('h2:has-text("Welcome")')
        this.userEmail = page.locator('[class*="userEmail"]')
        this.userRole = page.locator('[class*="userRole"]')

        // Dashboard cards
        this.implementationsCard = page.locator('a[href="/implementations"]').first()
        this.assessmentsCard = page.locator('a[href="/assessments"]').first()
        this.templatesCard = page.locator('a[href="/templates"]').first()
        this.usersCard = page.locator('a[href="/admin/users"]').first()
        this.monitoringCard = page.locator('a[href="/admin/monitoring"]').first()
        this.certificatesCard = page.locator('a[href="/admin/certificates"]').first()

        // Account status
        this.accountStatusCard = page.locator('text=Account Status').locator('..')
        this.tfaStatus = page.locator('text=Two-Factor Auth').locator('..').locator('[class*="statusValue"]')

        // Sidebar navigation
        this.dashboardNav = page.locator('nav a[href="/dashboard"]')
        this.implementationsNav = page.locator('nav a[href="/implementations"]')
        this.assessmentsNav = page.locator('nav a[href="/assessments"]')
        this.templatesNav = page.locator('nav a[href="/templates"]')
        this.usersNav = page.locator('nav a[href="/admin/users"]')
        this.certificatesNav = page.locator('nav a[href="/admin/certificates"]')
        this.monitoringNav = page.locator('nav a[href="/admin/monitoring"]')
        this.auditNav = page.locator('nav a[href="/admin/audit"]')
        this.keysNav = page.locator('nav a[href="/admin/keys"]')
        this.settingsNav = page.locator('nav a[href="/settings"]')
        this.logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out")')
    }

    async goto(): Promise<void> {
        // If already on dashboard, skip navigation to avoid triggering auth issues
        if (this.page.url().includes('/dashboard')) {
            console.log(`[DashboardPage.goto] Already on dashboard, skipping navigation`)
            await this.waitForPageLoad()
            return
        }

        // Debug: Check state before navigation
        const tokensBefore = await this.page.evaluate(() => localStorage.getItem('dhis2_cert_tokens'))
        console.log(`[DashboardPage.goto] Before navigation - URL: ${this.page.url()}, Has tokens: ${!!tokensBefore}`)

        await this.page.goto('/dashboard')
        await this.waitForPageLoad()

        // Debug: Check state after navigation
        const tokensAfter = await this.page.evaluate(() => localStorage.getItem('dhis2_cert_tokens'))
        console.log(`[DashboardPage.goto] After navigation - URL: ${this.page.url()}, Has tokens: ${!!tokensAfter}`)

        // If we have tokens but are on login, something's wrong
        if (tokensAfter && this.page.url().match(/\/$|\/login/)) {
            console.log(`[DashboardPage.goto] WARNING: Have tokens but on login page!`)
            const tokenData = JSON.parse(tokensAfter)
            const payload = JSON.parse(atob(tokenData.accessToken.split('.')[1]))
            console.log(`[DashboardPage.goto] Token exp: ${new Date(payload.exp * 1000).toISOString()}, Now: ${new Date().toISOString()}`)
        }
    }

    async isLoaded(): Promise<boolean> {
        try {
            await this.welcomeMessage.waitFor({ state: 'visible', timeout: 10000 })
            return true
        } catch {
            return false
        }
    }

    async getWelcomeText(): Promise<string | null> {
        return this.welcomeMessage.textContent()
    }

    async hasAdminFeatures(): Promise<boolean> {
        const templatesVisible = await this.templatesNav.isVisible().catch(() => false)
        const usersVisible = await this.usersNav.isVisible().catch(() => false)
        return templatesVisible && usersVisible
    }

    async navigateTo(destination: 'implementations' | 'assessments' | 'templates' | 'users' | 'certificates' | 'monitoring' | 'audit' | 'keys' | 'settings'): Promise<void> {
        const navMap = {
            implementations: this.implementationsNav,
            assessments: this.assessmentsNav,
            templates: this.templatesNav,
            users: this.usersNav,
            certificates: this.certificatesNav,
            monitoring: this.monitoringNav,
            audit: this.auditNav,
            keys: this.keysNav,
            settings: this.settingsNav,
        }

        await navMap[destination].click()
        await this.waitForNavigation()
    }

    async logout(): Promise<void> {
        await this.logoutButton.click()
        await this.page.waitForURL(/\/$|\/login/)
    }
}
