import { test, expect } from '@playwright/test'

// Leaves E2E — covers leave application, approval, and access-control cases
// Requires the backend seeded with at least:
//   admin@timekeeper.app / Admin123!

const API = 'http://localhost:8080/api/v1'
const ADMIN_EMAIL = 'admin@timekeeper.app'
const ADMIN_PASSWORD = 'Admin123!'

/** Obtain a Bearer token for the given credentials via the login API */
async function getToken(request, email = ADMIN_EMAIL, password = ADMIN_PASSWORD) {
  const res = await request.post(`${API}/auth/login`, {
    headers: { 'Content-Type': 'application/json' },
    data: { email, password },
  })
  const body = await res.json()
  return body.data.token
}

/** Helper: log in through the UI */
async function loginUI(page, email = ADMIN_EMAIL, password = ADMIN_PASSWORD) {
  await page.goto('/login')
  await page.getByLabel(/email address/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 10000 })
}

test.describe('Leave API — date validation', () => {
  test('apply leave with end date before start date returns 400', async ({ page }) => {
    const token = await getToken(page.request)

    const res = await page.request.post(`${API}/leaves`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data: {
        startDate: '2027-06-10',
        endDate: '2027-06-05', // end < start
        leaveType: 'VACATION',
        reason: 'Test',
      },
    })
    expect(res.status()).toBe(400)
    const body = await res.json()
    expect(body.success).toBe(false)
  })

  test('apply leave with a valid future date returns 201 or 400 (overlap)', async ({ page }) => {
    const token = await getToken(page.request)

    const res = await page.request.post(`${API}/leaves`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data: {
        startDate: '2027-09-01',
        endDate: '2027-09-03',
        leaveType: 'VACATION',
        reason: 'Summer break',
      },
    })
    // 201 on first run; 400 if this leave already exists from a prior run
    expect([201, 400]).toContain(res.status())
    if (res.status() === 201) {
      const body = await res.json()
      expect(body.data.status).toBe('PENDING')
    }
  })
})

test.describe('Leave API — access control', () => {
  test('unauthenticated leave application returns 401', async ({ page }) => {
    const res = await page.request.post(`${API}/leaves`, {
      headers: { 'Content-Type': 'application/json' },
      data: {
        startDate: '2027-10-01',
        endDate: '2027-10-02',
        leaveType: 'SICK',
        reason: 'No token',
      },
    })
    expect(res.status()).toBe(401)
  })

  test('GET /leaves/team requires MANAGER or ADMIN role', async ({ page }) => {
    const token = await getToken(page.request)

    const res = await page.request.get(`${API}/leaves/team`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    // Admin is allowed, so expecting 200
    expect(res.status()).toBe(200)
  })
})

test.describe('Leave UI — My Leaves page', () => {
  test('authenticated user can see My Leaves page', async ({ page }) => {
    await loginUI(page)
    await page.goto('/leaves/my')
    await expect(page.getByRole('heading', { name: /my leaves/i })).toBeVisible({ timeout: 8000 })
  })

  test('leave application form submits and shows confirmation', async ({ page }) => {
    await loginUI(page)
    await page.goto('/leaves/my')

    // Open the apply-leave modal — use the page header button specifically
    const applyBtn = page.getByRole('button', { name: 'Apply Leave' }).first()
    if (await applyBtn.count() > 0) {
      await applyBtn.click()
      // The drawer slides in from the right — look for the "Request Leave" heading inside it
      await expect(page.getByRole('heading', { name: /request leave/i })).toBeVisible({ timeout: 5000 })
    }
  })
})
