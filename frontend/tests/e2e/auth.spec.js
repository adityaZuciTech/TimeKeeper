import { test, expect } from '@playwright/test'

// These tests assume the app is running at http://localhost:5173
// and the backend is running at http://localhost:8080.
// Update ADMIN_EMAIL / ADMIN_PASSWORD to match your DataInitializer setup.

const ADMIN_EMAIL = 'admin@timekeeper.com'
const ADMIN_PASSWORD = 'admin123'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('shows login form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('shows error on invalid credentials', async ({ page }) => {
    await page.getByLabel(/email/i).fill('wrong@example.com')
    await page.getByLabel(/password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByText(/invalid email or password/i)).toBeVisible({ timeout: 5000 })
  })

  test('redirects authenticated user to dashboard', async ({ page }) => {
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL)
    await page.getByLabel(/password/i).fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })

  test('logout clears session and redirects to login', async ({ page }) => {
    // Login first
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL)
    await page.getByLabel(/password/i).fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/dashboard/)

    // Open user menu and click logout
    await page.getByLabel(/user menu/i).click()
    await page.getByRole('menuitem', { name: /logout/i }).click()
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 })

    // Token should be gone — navigating to /dashboard redirects to login
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })
})
