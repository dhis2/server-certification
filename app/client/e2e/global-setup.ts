import * as fs from 'fs'
import * as path from 'path'
import { FullConfig, chromium } from '@playwright/test'

/**
 * Global setup runs once before all tests
 * @see https://playwright.dev/docs/test-global-setup-teardown
 *
 * Use this for:
 * - Database seeding
 * - Authentication state setup
 * - Environment validation
 */
const globalSetup = async (config: FullConfig): Promise<void> => {
    console.log('Running global setup...')

    // Validate environment
    const baseURL = config.projects[0]?.use?.baseURL
    console.log(`Base URL: ${baseURL}`)

    // Create auth storage directory
    const authDir = path.join(__dirname, '.auth')
    if (!fs.existsSync(authDir)) {
        fs.mkdirSync(authDir, { recursive: true })
        console.log('Created auth storage directory:', authDir)
    }

    // Verify the application is running
    if (baseURL) {
        try {
            const browser = await chromium.launch()
            const context = await browser.newContext()
            const page = await context.newPage()

            console.log('Checking if application is running...')
            const response = await page.goto(baseURL, { timeout: 30000 })

            if (response && response.ok()) {
                console.log('Application is running and accessible')
            } else {
                console.warn(`Warning: Application returned status ${response?.status()}`)
            }

            await context.close()
            await browser.close()
        } catch (error) {
            console.error('Error connecting to application:', error)
            console.log('Make sure the dev server is running with: npm run start (in client directory)')
            // Don't fail setup - let the tests handle connection issues
        }
    }

    // Create empty auth state files if they don't exist
    // This prevents errors when tests try to use them before login succeeds
    const adminAuthFile = path.join(authDir, 'admin.json')
    const userAuthFile = path.join(authDir, 'user.json')

    const emptyState = {
        cookies: [],
        origins: [],
    }

    if (!fs.existsSync(adminAuthFile)) {
        fs.writeFileSync(adminAuthFile, JSON.stringify(emptyState, null, 2))
        console.log('Created empty admin auth state file')
    }

    if (!fs.existsSync(userAuthFile)) {
        fs.writeFileSync(userAuthFile, JSON.stringify(emptyState, null, 2))
        console.log('Created empty user auth state file')
    }

    console.log('Global setup completed')
}

export default globalSetup
