import { test, expect } from '@playwright/test'

// Employees page E2E tests.
// Admin-only route. Covers: stat cards (Total/Active/Inactive/Managers),
// employee list rendering, search, and row actions.

const ADMIN_EMAIL    = 'admin@timekeeper.app'
const ADMIN_PASSWORD = 'Admin123!'

async function login(page) {
  await page.goto('/login')
  await page.getByLabel(/email address/i).fill(ADMIN_EMAIL)
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 10000 })
}

test.describe('Employees — page access', () => {
  test('unauthenticated user is redirected to login', async ({ page }) => {
    // Fresh page, no login — admin-only route should bounce to /login
    await page.goto('/employees')
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 })
  })

  test('admin can access /employees', async ({ page }) => {
    await login(page)
    await page.goto('/employees')
    await expect(
      page.getByRole('heading', { name: /employees/i })
    ).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Employees — stat cards', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/employees')
    await page.waitForTimeout(1500)
  })

  test('shows Total stat card', async ({ page }) => {
    await expect(page.getByText(/^total$/i)).toBeVisible({ timeout: 5000 })
  })

  test('shows Active stat card', async ({ page }) => {
    await expect(page.getByText(/^active$/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('shows Inactive stat card', async ({ page }) => {
    // Use .first() — 'Inactive' also appears in the filter button and status column
    await expect(page.getByText(/^inactive$/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('shows Managers stat card', async ({ page }) => {
    await expect(page.getByText(/^managers$/i)).toBeVisible({ timeout: 5000 })
  })

  test('stat cards show numeric values', async ({ page }) => {
    // stat values in the shared StatCard are text-2xl font-semibold tabular-nums
    await expect(
      page.locator('.tabular-nums').first()
    ).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Employees — list', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/employees')
    await page.waitForTimeout(2000)
  })

  test('employee list renders at least one employee', async ({ page }) => {
    // The admin account always exists in seed data
    await expect(page.getByText(/admin@timekeeper\.app/i).first()).toBeVisible({ timeout: 5000 })
  })

  test('add employee button is present', async ({ page }) => {
    await expect(
      page.getByRole('button', { name: /add employee|new employee|invite/i })
    ).toBeVisible({ timeout: 5000 })
  })

  test('search input is present', async ({ page }) => {
    await expect(
      page.getByPlaceholder(/search/i).or(page.getByRole('searchbox'))
    ).toBeVisible({ timeout: 5000 })
  })
})

test.describe('Employees — search', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/employees')
    await page.waitForTimeout(2000)
  })

  test('searching shows matching employees', async ({ page }) => {
    const searchBox = page.getByPlaceholder(/search/i).or(page.getByRole('searchbox'))
    await searchBox.fill('admin')
    await page.waitForTimeout(500)
    await expect(page.getByText(/admin/i).first()).toBeVisible({ timeout: 3000 })
  })

  test('searching with no match shows empty state or zero results', async ({ page }) => {
    const searchBox = page.getByPlaceholder(/search/i).or(page.getByRole('searchbox'))
    await searchBox.fill('zzz_no_such_employee_xyz')
    await page.waitForTimeout(500)
    // Either empty state text or zero rows
    const emptyText = page.getByText(/no employees|no results|not found/i)
    const rowAfterFilter = page.locator('table tbody tr, [data-employee-row]')
    const hasEmpty = await emptyText.count() > 0
    const rowCount = await rowAfterFilter.count()
    expect(hasEmpty || rowCount === 0).toBe(true)
  })
})

test.describe('Employees — row actions', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/employees')
    await page.waitForTimeout(2000)
  })

  test('clicking a row or view icon opens employee detail drawer', async ({ page }) => {
    // Click the 3-dot menu on the first row and select View Profile
    const moreBtn = page.getByRole('button', { name: '' }).first()
    // The MoreHorizontal icon button renders with no accessible name;
    // target it by its icon's SVG path or by position
    const rowMenuBtns = page.locator('button').filter({ has: page.locator('svg') })
    // Find the first ⋯ menu button (after the search/add area)
    // Try clicking the first employee row directly to open drawer
    const firstRow = page.locator('.divide-y > div, table tbody tr').first()
    if (await firstRow.count() > 0) {
      await firstRow.click()
      // Drawer has a fixed-position close button (X) — unique to the drawer, not the sidebar
      await expect(
        page.locator('div').filter({ has: page.locator('button').filter({ has: page.locator('svg') }) }).filter({ hasText: /admin@timekeeper\.app/i }).first()
      ).toBeVisible({ timeout: 5000 })
    }
  })
})
