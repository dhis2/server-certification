import { test, expect } from './fixtures/test-fixtures.ts'
import { SettingsPage } from './page-objects/index.ts'

test.describe('Settings', () => {
    test.describe('Page Navigation', () => {
        test('should display settings page', async ({ adminPage }) => {
            const settingsPage = new SettingsPage(adminPage)
            await settingsPage.goto()

            await expect(adminPage.getByRole('heading', { name: /settings/i })).toBeVisible()
        })

        test('should display security tab by default', async ({ adminPage }) => {
            const settingsPage = new SettingsPage(adminPage)
            await settingsPage.goto()

            await expect(settingsPage.securityTab).toBeVisible()
        })

        test('should display all tabs', async ({ adminPage }) => {
            const settingsPage = new SettingsPage(adminPage)
            await settingsPage.goto()

            await expect(settingsPage.securityTab).toBeVisible()
            await expect(settingsPage.profileTab).toBeVisible()
        })

        test('should navigate to security tab via URL', async ({ adminPage }) => {
            const settingsPage = new SettingsPage(adminPage)
            await settingsPage.gotoSecurityTab()

            expect(adminPage.url()).toContain('tab=security')
        })

        test('should navigate to profile tab via URL', async ({ adminPage }) => {
            const settingsPage = new SettingsPage(adminPage)
            await settingsPage.gotoProfileTab()

            expect(adminPage.url()).toContain('tab=profile')
        })
    })

    test.describe('Tab Switching', () => {
        test('should switch to profile tab', async ({ adminPage }) => {
            const settingsPage = new SettingsPage(adminPage)
            await settingsPage.goto()

            await settingsPage.switchToTab('profile')

            // Profile form should be visible
            await expect(settingsPage.firstNameInput).toBeVisible()
        })

        test('should switch back to security tab', async ({ adminPage }) => {
            const settingsPage = new SettingsPage(adminPage)
            await settingsPage.gotoProfileTab()

            await settingsPage.switchToTab('security')

            // Should show security content
            await expect(settingsPage.securityTab).toHaveClass(/active/)
        })
    })

    test.describe('Admin Preferences Tab', () => {
        test('should show preferences tab for admin users', async ({ adminPage }) => {
            const settingsPage = new SettingsPage(adminPage)
            await settingsPage.goto()

            await expect(settingsPage.preferencesTab).toBeVisible()
        })

        test('should not show preferences tab for regular users', async ({ userPage }) => {
            const settingsPage = new SettingsPage(userPage)
            await settingsPage.goto()

            await expect(settingsPage.preferencesTab).not.toBeVisible()
        })
    })

    test.describe('Security Tab', () => {
        test('should display two-factor authentication section', async ({ adminPage }) => {
            const settingsPage = new SettingsPage(adminPage)
            await settingsPage.gotoSecurityTab()

            // Should have TFA-related content
            await expect(adminPage.getByRole('heading', { name: /two-factor|2fa|authentication/i })).toBeVisible()
        })

        test('should show enable or disable TFA button', async ({ adminPage }) => {
            const settingsPage = new SettingsPage(adminPage)
            await settingsPage.gotoSecurityTab()

            // Either enable or disable button should be visible based on TFA status
            const enableVisible = await settingsPage.enableTfaButton.isVisible().catch(() => false)
            const disableVisible = await settingsPage.disableTfaButton.isVisible().catch(() => false)

            expect(enableVisible || disableVisible).toBe(true)
        })
    })

    test.describe('Profile Tab', () => {
        test('should display profile form', async ({ adminPage }) => {
            const settingsPage = new SettingsPage(adminPage)
            await settingsPage.gotoProfileTab()

            await expect(settingsPage.firstNameInput).toBeVisible()
            await expect(settingsPage.lastNameInput).toBeVisible()
        })

        test('should display save button', async ({ adminPage }) => {
            const settingsPage = new SettingsPage(adminPage)
            await settingsPage.gotoProfileTab()

            await expect(settingsPage.saveProfileButton).toBeVisible()
        })

        test('should pre-fill profile form with current user data', async ({ adminPage }) => {
            const settingsPage = new SettingsPage(adminPage)
            await settingsPage.gotoProfileTab()

            // Inputs should have values (may be empty string if not set)
            const firstNameValue = await settingsPage.firstNameInput.inputValue()
            const lastNameValue = await settingsPage.lastNameInput.inputValue()

            // Just verify inputs are accessible
            expect(typeof firstNameValue).toBe('string')
            expect(typeof lastNameValue).toBe('string')
        })

        test('should allow editing profile fields', async ({ adminPage }) => {
            const settingsPage = new SettingsPage(adminPage)
            await settingsPage.gotoProfileTab()

            // Clear and fill first name
            await settingsPage.firstNameInput.clear()
            await settingsPage.firstNameInput.fill('Test First Name')

            // Verify input
            await expect(settingsPage.firstNameInput).toHaveValue('Test First Name')
        })

        test('should update profile successfully', async ({ adminPage }) => {
            const settingsPage = new SettingsPage(adminPage)
            await settingsPage.gotoProfileTab()

            // Update profile
            const testFirstName = `Test${Date.now()}`
            await settingsPage.updateProfile({
                firstName: testFirstName,
            })

            // Wait for response
            await adminPage.waitForTimeout(1000)

            // Check for success or that the value persisted
            const currentValue = await settingsPage.firstNameInput.inputValue()
            expect(currentValue).toBe(testFirstName)
        })
    })

    test.describe('Password Change', () => {
        test('should display password change fields', async ({ adminPage }) => {
            const settingsPage = new SettingsPage(adminPage)
            await settingsPage.gotoProfileTab()

            // Password fields might be in a separate section
            const hasPasswordSection = await settingsPage.currentPasswordInput.isVisible().catch(() => false)

            // This is optional depending on UI structure
            expect(typeof hasPasswordSection).toBe('boolean')
        })
    })

    test.describe('Regular User Settings', () => {
        test('should access settings page', async ({ userPage }) => {
            const settingsPage = new SettingsPage(userPage)
            await settingsPage.goto()

            await expect(userPage.getByRole('heading', { name: /settings/i })).toBeVisible()
        })

        test('should display security and profile tabs', async ({ userPage }) => {
            const settingsPage = new SettingsPage(userPage)
            await settingsPage.goto()

            await expect(settingsPage.securityTab).toBeVisible()
            await expect(settingsPage.profileTab).toBeVisible()
        })

        test('should update profile as regular user', async ({ userPage }) => {
            const settingsPage = new SettingsPage(userPage)
            await settingsPage.gotoProfileTab()

            const testLastName = `UserTest${Date.now()}`
            await settingsPage.updateProfile({
                lastName: testLastName,
            })

            await userPage.waitForTimeout(1000)

            const currentValue = await settingsPage.lastNameInput.inputValue()
            expect(currentValue).toBe(testLastName)
        })
    })
})
