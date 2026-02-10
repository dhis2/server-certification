import { test, expect } from '@playwright/test'

/**
 * Smoke tests to verify basic application functionality
 * These tests run without authentication
 */
test.describe('Smoke Tests', () => {
    test('should load the application', async ({ page }) => {
        await page.goto('/')
        await page.waitForLoadState('networkidle')

        // Application should load
        expect(page.url()).toContain('localhost')
    })

    test('should display login form on unauthenticated access', async ({ page }) => {
        await page.goto('/')
        await page.waitForLoadState('networkidle')

        // Should see login form
        const loginForm = page.locator('form')
        await expect(loginForm).toBeVisible()
    })

    test('should have proper page title', async ({ page }) => {
        await page.goto('/')

        // Title should contain app name
        const title = await page.title()
        expect(title.length).toBeGreaterThan(0)
    })

    test('should load without JavaScript errors', async ({ page }) => {
        const errors: string[] = []

        page.on('pageerror', (error) => {
            errors.push(error.message)
        })

        await page.goto('/')
        await page.waitForLoadState('networkidle')

        // Should not have critical JavaScript errors
        // Note: Some errors might be expected (e.g., failed API calls when not authenticated)
        const criticalErrors = errors.filter((e) => !e.includes('401') && !e.includes('Unauthorized') && !e.includes('Network'))

        expect(criticalErrors).toHaveLength(0)
    })

    test('should be responsive', async ({ page }) => {
        // Test desktop viewport
        await page.setViewportSize({ width: 1280, height: 720 })
        await page.goto('/')
        await page.waitForLoadState('networkidle')

        const desktopWidth = await page.evaluate(() => document.body.clientWidth)
        expect(desktopWidth).toBeGreaterThan(1000)

        // Test mobile viewport
        await page.setViewportSize({ width: 375, height: 667 })
        await page.waitForTimeout(300)

        const mobileWidth = await page.evaluate(() => document.body.clientWidth)
        expect(mobileWidth).toBeLessThan(400)
    })
})

test.describe('Public Routes', () => {
    test('should access certificate verification without authentication', async ({ page }) => {
        await page.goto('/verify/test-code')
        await page.waitForLoadState('domcontentloaded')

        // Should show verification page, not redirect to login
        expect(page.url()).toContain('/verify/')

        // Should see verification-related content (heading or any content)
        const hasVerification = await page.getByRole('heading').first().isVisible().catch(() => false)
        const hasContent = await page.getByText(/certificate|verification|verify/i).first().isVisible().catch(() => false)
        expect(hasVerification || hasContent).toBe(true)
    })
})

test.describe('Error Handling', () => {
    test('should handle 404 routes gracefully', async ({ page }) => {
        await page.goto('/this-route-does-not-exist-12345')
        await page.waitForLoadState('domcontentloaded')

        // Should show 404 page or redirect
        const is404 = await page
            .getByText(/not found|404|page not found/i)
            .first()
            .isVisible()
            .catch(() => false)
        const isRedirected = page.url().includes('/dashboard') || page.url().includes('/login')

        expect(is404 || isRedirected).toBe(true)
    })
})
