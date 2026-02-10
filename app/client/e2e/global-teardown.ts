import { FullConfig } from '@playwright/test'

/**
 * Global teardown runs once after all tests
 * @see https://playwright.dev/docs/test-global-setup-teardown
 *
 * Use this for:
 * - Cleaning up test data
 * - Removing temporary files
 * - Final reporting
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const globalTeardown = async (_config: FullConfig): Promise<void> => {
    console.log('Running global teardown...')

    // Auth files are kept for faster subsequent runs in development
    // Add cleanup code here if needed

    console.log('Global teardown completed')
}

export default globalTeardown
