import { test, expect } from '@playwright/test'

const USER_EMAIL = 'admin@timekeeper.app'
const USER_PASSWORD = 'Admin123!'

test.describe('404 not found', () => {
  test('shows 404 page for unknown routes (unauthenticated)', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-at-all')
    // Should NOT silently redirect to / — should show 404
    await expect(page.getByText('404')).toBeVisible({ timeout: 5000 })
    await expect(page.getByRole('button', { name: /back to home/i })).toBeVisible()
  })
})

test.describe('Leaves', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email address/i).fill(USER_EMAIL)
    await page.getByLabel(/password/i).fill(USER_PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/dashboard/)
  })

  test('shows my leaves page', async ({ page }) => {
    await page.goto('/leaves/my')
    await expect(page.getByRole('heading', { name: /my leaves/i })).toBeVisible({ timeout: 5000 })
  })

  test('apply leave button is present', async ({ page }) => {
    await page.goto('/leaves/my')
    await expect(
      page.getByRole('button', { name: /apply leave|request leave/i }).first()
    ).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Reports', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email address/i).fill(USER_EMAIL)
    await page.getByLabel(/password/i).fill(USER_PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/dashboard/)
  })

  test('organization page accessible by admin', async ({ page }) => {
    await page.goto('/organization')
    await expect(page.getByRole('heading', { name: /organization|reports/i })).toBeVisible({ timeout: 5000 })
  })
})
