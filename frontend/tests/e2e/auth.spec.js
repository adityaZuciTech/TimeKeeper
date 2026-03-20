import { test, expect } from '@playwright/test'

// These tests assume the app is running via BASE_URL env var (default: http://localhost:5173)
// and the backend is running at http://localhost:8080.

const ADMIN_EMAIL = 'admin@timekeeper.app'
const ADMIN_PASSWORD = 'Admin123!'

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('shows login form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible()
    await expect(page.getByLabel(/email address/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('shows error on invalid credentials', async ({ page }) => {
    await page.getByLabel(/email address/i).fill('wrong@example.com')
    await page.getByLabel(/password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()
    // Bad credentials must NOT redirect to dashboard — user stays on login
    await page.waitForTimeout(2000)
    await expect(page).toHaveURL(/\/login/)
  })

  test('redirects authenticated user to dashboard', async ({ page }) => {
    await page.getByLabel(/email address/i).fill(ADMIN_EMAIL)
    await page.getByLabel(/password/i).fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 })
  })

  test('logout clears session and redirects to login', async ({ page }) => {
    await page.getByLabel(/email address/i).fill(ADMIN_EMAIL)
    await page.getByLabel(/password/i).fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForURL(/\/dashboard/)

    // Open user menu (aria-label="User menu") and click Sign Out button
    await page.getByLabel(/user menu/i).click()
    await page.getByRole('button', { name: /sign out/i }).click()
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 })

    // Token should be gone - navigating to /dashboard redirects to login
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })
})
