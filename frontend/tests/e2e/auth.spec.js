import { test, expect } from '@playwright/test'

// These tests assume the app is running via BASE_URL env var (default: http://localhost:5173)
// and the backend is running at http://localhost:8080.

const ADMIN_EMAIL = 'admin@timekeeper.app'
const ADMIN_PASSWORD = 'Admin123!'

/** Helper: log in and land on /dashboard */
async function login(page, email = ADMIN_EMAIL, password = ADMIN_PASSWORD) {
  await page.goto('/login')
  await page.getByLabel(/email address/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 10000 })
}

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

test.describe('Change Password', () => {
  // ── helper: open the Security accordion on the Profile page ───────────────
  async function openSecuritySection(page) {
    await page.goto('/profile')
    // The Security section is a collapsible accordion — click it to expand
    await page.getByRole('button', { name: /security/i }).click()
    await expect(page.getByRole('button', { name: /update password/i })).toBeVisible({ timeout: 5000 })
  }

  test('change-password API is only reachable when authenticated', async ({ page }) => {
    // Unauthenticated direct API call must return 401, not 500
    const res = await page.request.post('http://localhost:8080/api/v1/auth/change-password', {
      headers: { 'Content-Type': 'application/json' },
      data: { currentPassword: 'anything', newPassword: 'NewPass123!' },
    })
    expect(res.status()).toBe(401)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  test('shows error for wrong current password', async ({ page }) => {
    await login(page)
    await openSecuritySection(page)

    await page.getByLabel(/current password/i).fill('WrongPassword!')
    await page.getByLabel(/^new password$/i).fill('NewPass123!')
    await page.getByLabel(/confirm new password/i).fill('NewPass123!')
    await page.getByRole('button', { name: /update password/i }).click()

    // Should show a toast error — not navigate away or crash
    await expect(page.getByText(/current password is incorrect|failed to change password/i))
      .toBeVisible({ timeout: 6000 })
    // Must stay on /profile
    await expect(page).toHaveURL(/\/profile/)
  })

  test('shows validation error when new passwords do not match', async ({ page }) => {
    await login(page)
    await openSecuritySection(page)

    await page.getByLabel(/current password/i).fill(ADMIN_PASSWORD)
    await page.getByLabel(/^new password$/i).fill('NewPass123!')
    await page.getByLabel(/confirm new password/i).fill('DifferentPass!')
    await page.getByRole('button', { name: /update password/i }).click()

    // Frontend validation fires before any API call
    await expect(page.getByText(/passwords do not match/i)).toBeVisible({ timeout: 4000 })
  })

  test('profile page security section is accessible when logged in', async ({ page }) => {
    await login(page)
    await page.goto('/profile')
    await expect(page.getByRole('button', { name: /security/i })).toBeVisible()
  })

  // AUTH-15: new password shorter than 8 chars is rejected by backend validation
  test('change-password API rejects new password shorter than 8 characters', async ({ page }) => {
    // Obtain a valid JWT first via the login API
    const loginRes = await page.request.post('http://localhost:8080/api/v1/auth/login', {
      headers: { 'Content-Type': 'application/json' },
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    })
    expect(loginRes.status()).toBe(200)
    const { data } = await loginRes.json()
    const token = data.token

    const res = await page.request.post('http://localhost:8080/api/v1/auth/change-password', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data: { currentPassword: ADMIN_PASSWORD, newPassword: 'short' }, // only 5 chars
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
  })
})
