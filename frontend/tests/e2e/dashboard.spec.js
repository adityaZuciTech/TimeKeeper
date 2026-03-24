import { test, expect } from '@playwright/test'

// Dashboard E2E tests for the March 2026 UX overhaul.
// Covers: role-aware content, Quick Actions removal, Activity Feed removal,
//         stat cards, This Week card, Recent Timesheets full-width panel,
//         and manager attention strip.

const ADMIN_EMAIL    = 'admin@timekeeper.app'
const ADMIN_PASSWORD = 'Admin123!'

async function login(page, email = ADMIN_EMAIL, password = ADMIN_PASSWORD) {
  await page.goto('/login')
  await page.getByLabel(/email address/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 10000 })
}

test.describe('Dashboard — structure', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('loads dashboard and shows greeting heading', async ({ page }) => {
    await page.goto('/dashboard')
    // Greeting contains Good morning / Good afternoon / Good evening
    await expect(
      page.getByRole('heading', { level: 1 })
    ).toContainText(/good (morning|afternoon|evening)/i, { timeout: 5000 })
  })

  test('shows "New Timesheet" CTA button in hero', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(
      page.getByRole('button', { name: /new timesheet/i }).first()
    ).toBeVisible({ timeout: 5000 })
  })

  test('"New Timesheet" button navigates to /timesheets/new', async ({ page }) => {
    await page.goto('/dashboard')
    await page.getByRole('button', { name: /new timesheet/i }).first().click()
    await expect(page).toHaveURL(/\/timesheets\/new/, { timeout: 8000 })
  })
})

test.describe('Dashboard — role-aware subtitle', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('admin sees manager-role subtitle', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(
      page.getByText("Here's what needs your attention today.")
    ).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Dashboard — This Week card', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('shows "This Week" section with hour display', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText(/this week/i).first()).toBeVisible({ timeout: 5000 })
    // Shows X.Xh / 40h pattern
    await expect(page.getByText(/\/\s*40h/)).toBeVisible({ timeout: 5000 })
  })

  test('shows target or remaining hours text', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(
      page.getByText(/target reached|h remaining/i)
        .or(page.getByText(/no timesheet this week/i))
        .or(page.getByRole('button', { name: /start this week/i }))
    ).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Dashboard — stat cards', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('shows Total Weeks stat card', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText(/total weeks/i)).toBeVisible({ timeout: 5000 })
  })

  test('shows Submitted stat card', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText('Submitted').first()).toBeVisible({ timeout: 5000 })
  })

  test('shows In Draft stat card', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText(/in draft/i)).toBeVisible({ timeout: 5000 })
  })

  test('shows Avg / Week stat card', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText(/avg \/ week/i)).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Dashboard — removed sections (regression)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/dashboard')
    // Wait for page to fully render
    await page.waitForTimeout(1500)
  })

  test('Quick Actions section is absent', async ({ page }) => {
    // Quick Actions was removed — it was a set of 3 redundant nav buttons
    await expect(page.getByText(/quick actions/i)).not.toBeVisible()
  })

  test('Activity Feed section is absent', async ({ page }) => {
    // Activity Feed was removed — same data as Recent Timesheets, different visual
    await expect(page.getByText(/your recent timesheet actions/i)).not.toBeVisible()
  })

  test('"Log Time" quick-action button is absent', async ({ page }) => {
    await expect(page.getByRole('button', { name: /^log time$/i })).not.toBeVisible()
  })

  test('"My Timesheets" quick-action button is absent', async ({ page }) => {
    await expect(page.getByRole('button', { name: /^my timesheets$/i })).not.toBeVisible()
  })
})

test.describe('Dashboard — Recent Timesheets panel', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('Recent Timesheets panel is visible', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByText('Recent Timesheets')).toBeVisible({ timeout: 5000 })
  })

  test('"View all" link navigates to /timesheets', async ({ page }) => {
    await page.goto('/dashboard')
    const link = page.getByRole('link', { name: /view all/i })
    await expect(link).toBeVisible({ timeout: 5000 })
    await link.click()
    await expect(page).toHaveURL(/\/timesheets$/, { timeout: 8000 })
  })

  test('Recent Timesheets shows timesheet rows or empty state', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForTimeout(2000)
    // Either timesheet rows exist OR the empty state message is shown
    const hasRows = await page.locator('.divide-y button').count() > 0
    if (!hasRows) {
      await expect(page.getByText(/no timesheets yet/i)).toBeVisible({ timeout: 5000 })
    } else {
      // Each row has an ArrowRight icon (rendered as SVG) - just verify rows loaded
      expect(hasRows).toBe(true)
    }
  })
})

test.describe('Dashboard — manager attention strip', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('attention strip, if present, links to /leaves/team for pending leaves', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForTimeout(2000)
    // The strip only renders when badges.leaves > 0 or badges.team > 0
    // Test that IF it appears, it navigates correctly
    const leaveBtn = page.getByRole('button', { name: /leave request/i })
    const count = await leaveBtn.count()
    if (count > 0) {
      await leaveBtn.click()
      await expect(page).toHaveURL(/\/leaves\/team/, { timeout: 8000 })
    } else {
      // Strip not shown — acceptable when no pending items
      test.info().annotations.push({ type: 'skip-reason', description: 'No pending leave badges — attention strip not rendered' })
    }
  })

  test('attention strip, if present, links to /team for team updates', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForTimeout(2000)
    const teamBtn = page.getByRole('button', { name: /team update/i })
    const count = await teamBtn.count()
    if (count > 0) {
      await teamBtn.click()
      await expect(page).toHaveURL(/\/team$/, { timeout: 8000 })
    } else {
      test.info().annotations.push({ type: 'skip-reason', description: 'No team badge — attention strip not rendered' })
    }
  })
})
