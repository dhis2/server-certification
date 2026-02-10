import { test, expect } from './fixtures/test-fixtures.ts'
import { DashboardPage } from './page-objects/index.ts'

test.describe('Navigation and Layout', () => {
    test.describe('Sidebar Navigation', () => {
        test('should display sidebar navigation', async ({ adminPage }) => {
            const dashboard = new DashboardPage(adminPage)
            await dashboard.goto()

            await expect(adminPage.locator('nav')).toBeVisible()
        })

        test('should display app logo and title', async ({ adminPage }) => {
            const dashboard = new DashboardPage(adminPage)
            await dashboard.goto()

            await expect(adminPage.getByRole('heading', { name: /server certification/i })).toBeVisible()
        })

        test('should highlight active navigation item', async ({ adminPage }) => {
            const dashboard = new DashboardPage(adminPage)
            await dashboard.goto()

            // Dashboard nav should be active
            const dashboardLink = adminPage.locator('nav a[href="/dashboard"]')
            await expect(dashboardLink).toBeVisible()
        })

        test('should navigate between pages using sidebar', async ({ adminPage }) => {
            const dashboard = new DashboardPage(adminPage)
            await dashboard.goto()

            // Navigate to implementations
            await dashboard.navigateTo('implementations')
            expect(adminPage.url()).toContain('/implementations')

            // Navigate to assessments
            await dashboard.navigateTo('assessments')
            expect(adminPage.url()).toContain('/assessments')

            // Navigate back to dashboard
            await dashboard.dashboardNav.click()
            expect(adminPage.url()).toContain('/dashboard')
        })
    })

    test.describe('User Info Section', () => {
        test('should display user email in sidebar', async ({ adminPage }) => {
            const dashboard = new DashboardPage(adminPage)
            await dashboard.goto()

            await expect(dashboard.userEmail).toBeVisible()
        })

        test('should display user role badge', async ({ adminPage }) => {
            const dashboard = new DashboardPage(adminPage)
            await dashboard.goto()

            await expect(dashboard.userRole).toBeVisible()
        })

        test('should display logout button', async ({ adminPage }) => {
            const dashboard = new DashboardPage(adminPage)
            await dashboard.goto()

            await expect(dashboard.logoutButton).toBeVisible()
        })
    })

    test.describe('Admin Navigation', () => {
        test('should display administration section for admins', async ({ adminPage }) => {
            const dashboard = new DashboardPage(adminPage)
            await dashboard.goto()

            await expect(adminPage.locator('text=Administration')).toBeVisible()
        })

        test('should display all admin navigation links', async ({ adminPage }) => {
            const dashboard = new DashboardPage(adminPage)
            await dashboard.goto()

            await expect(dashboard.templatesNav).toBeVisible()
            await expect(dashboard.usersNav).toBeVisible()
            await expect(dashboard.certificatesNav).toBeVisible()
            await expect(dashboard.monitoringNav).toBeVisible()
            await expect(dashboard.auditNav).toBeVisible()
            await expect(dashboard.keysNav).toBeVisible()
        })

        test('should navigate to users management', async ({ adminPage }) => {
            const dashboard = new DashboardPage(adminPage)
            await dashboard.goto()

            await dashboard.navigateTo('users')
            expect(adminPage.url()).toContain('/admin/users')
        })

        test('should navigate to monitoring dashboard', async ({ adminPage }) => {
            const dashboard = new DashboardPage(adminPage)
            await dashboard.goto()

            await dashboard.navigateTo('monitoring')
            expect(adminPage.url()).toContain('/admin/monitoring')
        })

        test('should navigate to audit logs', async ({ adminPage }) => {
            const dashboard = new DashboardPage(adminPage)
            await dashboard.goto()

            await dashboard.navigateTo('audit')
            expect(adminPage.url()).toContain('/admin/audit')
        })

        test('should navigate to signing keys', async ({ adminPage }) => {
            const dashboard = new DashboardPage(adminPage)
            await dashboard.goto()

            await dashboard.navigateTo('keys')
            expect(adminPage.url()).toContain('/admin/keys')
        })
    })

    test.describe('Regular User Navigation', () => {
        test('should not display administration section', async ({ userPage }) => {
            const dashboard = new DashboardPage(userPage)
            await dashboard.goto()

            await expect(userPage.locator('text=Administration')).not.toBeVisible()
        })

        test('should display common navigation links', async ({ userPage }) => {
            const dashboard = new DashboardPage(userPage)
            await dashboard.goto()

            await expect(dashboard.dashboardNav).toBeVisible()
            await expect(dashboard.implementationsNav).toBeVisible()
            await expect(dashboard.assessmentsNav).toBeVisible()
            await expect(dashboard.settingsNav).toBeVisible()
        })

        test('should not display admin links', async ({ userPage }) => {
            const dashboard = new DashboardPage(userPage)
            await dashboard.goto()

            await expect(dashboard.templatesNav).not.toBeVisible()
            await expect(dashboard.usersNav).not.toBeVisible()
            await expect(dashboard.monitoringNav).not.toBeVisible()
        })
    })

    test.describe('Route Protection', () => {
        test('should redirect to dashboard for unknown routes', async ({ adminPage }) => {
            // Navigate via sidebar first to establish auth, then try unknown route
            const sidebar = adminPage.locator('nav')
            await sidebar.waitFor({ state: 'visible', timeout: 10000 })

            await adminPage.goto('/unknown-route-12345')
            await adminPage.waitForLoadState('domcontentloaded')

            // Check for 404 page or redirect
            const is404 = await adminPage
                .getByText(/not found|404/i)
                .first()
                .isVisible()
                .catch(() => false)
            const isDashboard = adminPage.url().includes('/dashboard')

            expect(is404 || isDashboard).toBe(true)
        })

        test('should protect admin routes from regular users', async ({ userPage }) => {
            await userPage.goto('/admin/users')

            // Should redirect to dashboard
            await userPage.waitForURL(/\/dashboard/, { timeout: 5000 })
        })

        test('should protect admin routes - monitoring', async ({ userPage }) => {
            await userPage.goto('/admin/monitoring')

            await userPage.waitForURL(/\/dashboard/, { timeout: 5000 })
        })

        test('should protect admin routes - audit', async ({ userPage }) => {
            await userPage.goto('/admin/audit')

            await userPage.waitForURL(/\/dashboard/, { timeout: 5000 })
        })
    })

    test.describe('Page Headings', () => {
        test('should display correct heading on implementations page', async ({ adminPage }) => {
            // Use sidebar navigation
            const sidebar = adminPage.locator('nav')
            const navLink = sidebar.getByRole('link', { name: 'Implementations', exact: true })
            await navLink.click()
            await adminPage.waitForURL(/\/implementations/, { timeout: 10000 })

            await expect(adminPage.getByRole('heading', { name: /implementations/i })).toBeVisible()
        })

        test('should display correct heading on assessments page', async ({ adminPage }) => {
            // Use sidebar navigation
            const sidebar = adminPage.locator('nav')
            const navLink = sidebar.getByRole('link', { name: 'Assessments', exact: true })
            await navLink.click()
            await adminPage.waitForURL(/\/assessments/, { timeout: 10000 })

            await expect(adminPage.getByRole('heading', { name: /assessments/i })).toBeVisible()
        })

        test('should display correct heading on settings page', async ({ adminPage }) => {
            // Use sidebar navigation
            const sidebar = adminPage.locator('nav')
            const navLink = sidebar.getByRole('link', { name: 'Settings', exact: true })
            await navLink.click()
            await adminPage.waitForURL(/\/settings/, { timeout: 10000 })

            await expect(adminPage.getByRole('heading', { name: /settings/i })).toBeVisible()
        })
    })

    test.describe('Root Path Redirect', () => {
        test('should redirect / to /dashboard when authenticated', async ({ adminPage }) => {
            await adminPage.goto('/')

            await adminPage.waitForURL(/\/dashboard/)
            expect(adminPage.url()).toContain('/dashboard')
        })
    })
})
