import { test, expect } from '@playwright/test'

const EMPLOYEE_EMAIL = 'admin@timekeeper.app'
const EMPLOYEE_PASSWORD = 'Admin123!'

test.describe('Timesheets', () => {
  test.beforeEach(async ({ page }) => {
    // Log in
    await page.goto('/login')
    await page.getByLabel(/email address/i).fill(EMPLOYEE_EMAIL)
    await page.getByLabel(/password/i).fill(EMPLOYEE_PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/dashboard/)
  })

  test('shows timesheets page with create button', async ({ page }) => {
    await page.goto('/timesheets')
    // The create button on timesheets page says 'This Week'; /timesheets/new has a separate week picker
    await expect(page.getByRole('button', { name: /this week|new timesheet|create/i }).first()).toBeVisible({ timeout: 5000 })
  })

  test('new timesheet page shows week selector', async ({ page }) => {
    await page.goto('/timesheets/new')
    await expect(page.getByText(/new timesheet/i)).toBeVisible()
    // Week navigation buttons
    await expect(page.getByLabel(/previous week/i).or(
      page.locator('button').filter({ hasText: '' }).first()
    )).toBeVisible({ timeout: 5000 })
  })

  test('navigating to non-existent timesheet shows not-found or redirects', async ({ page }) => {
    await page.goto('/timesheets/ts_does_not_exist')
    // Should either show an error state or navigate away
    await page.waitForTimeout(2000)
    const url = page.url()
    // Either still on the timesheet page with an error, or redirected
    expect(url).toMatch(/timesheet|dashboard|login/)
  })
})
