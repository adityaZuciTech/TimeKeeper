---
name: e2e-testing
description: "End-to-end testing skill for the TimeKeeper application. Use when: writing new Playwright e2e specs, adding test cases to existing spec files, debugging failing e2e tests, running the full test suite, understanding the test architecture, or extending coverage for auth, timesheets, employees, leaves, reports, security, or API access-control scenarios."
argument-hint: "Describe what to test (e.g. 'add tests for manager approval flow', 'debug failing auth spec')"
---

# TimeKeeper — E2E Testing

## Architecture Overview

TimeKeeper has **two distinct test layers** — do not mix them:

| Layer | Tool | Location | Command |
|---|---|---|---|
| Unit / Component | Vitest + Testing Library | `frontend/src/**/*.test.{js,jsx}` | `npm test` |
| End-to-End | Playwright (Chromium) | `frontend/tests/e2e/*.spec.js` | `npm run test:e2e` |

E2e tests require **both servers to be running** before any spec executes.

---

## Prerequisites — Start Both Servers

### 1. Backend (Spring Boot)

```powershell
cd backend
# Ensure application-dev.properties has DB credentials, then:
mvn spring-boot:run -Dspring-boot.run.profiles=dev
# Listens on http://localhost:8080
```

### 2. Frontend (Vite dev server)

```powershell
cd frontend
npm run dev
# Listens on http://localhost:5173
```

> The `playwright.config.js` sets `baseURL: process.env.BASE_URL || 'http://localhost:5173'`.  
> Override with `$env:BASE_URL="http://localhost:5174"` if the default port is busy.

---

## Running Tests

```powershell
# All e2e specs (from frontend/)
npm run test:e2e

# Single spec file
npx playwright test tests/e2e/auth.spec.js

# Interactive UI mode (watch + trace viewer)
npm run test:e2e:ui

# With a custom base URL
$env:BASE_URL="http://localhost:5174"; npm run test:e2e

# Headed (see the browser)
npx playwright test --headed
```

---

## Test Credentials

All specs use a seed account that must exist in the database:

| Role | Email | Password |
|---|---|---|
| ADMIN | `admin@timekeeper.app` | `Admin123!` |

The admin account has ADMIN role so it passes all role guards. Some specs (leaves, security) use this account for direct API calls via `page.request`.

### Login Helper Pattern

Every spec file defines a local `login(page)` helper — **do not import a shared helper**. This is intentional: tests stay self-contained and resilient to refactoring.

```js
async function login(page, email = ADMIN_EMAIL, password = ADMIN_PASSWORD) {
  await page.goto('/login')
  await page.getByLabel(/email address/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 10_000 })
}
```

### API Token Helper Pattern

For direct API tests (no UI), obtain a bearer token via the login endpoint:

```js
async function getToken(request, email = ADMIN_EMAIL, password = ADMIN_PASSWORD) {
  const res = await request.post(`${API}/auth/login`, {
    headers: { 'Content-Type': 'application/json' },
    data: { email, password },
  })
  const body = await res.json()
  return body.data.token
}
```

---

## Spec File Map

| File | Tests | What it covers |
|---|---|---|
| `auth.spec.js` | Login form render, bad credentials, successful login, logout, change-password API validation |
| `dashboard.spec.js` | Dashboard structure, greeting heading, stat cards, role-aware content |
| `employees.spec.js` | Unauthenticated redirect, admin access, stat cards, employee list, search |
| `general.spec.js` | 404 page, leaves page, apply-leave button, organization page |
| `leaves.spec.js` | Leave date validation API, leave application via UI, unauthenticated 401, team leaves access-control |
| `security.spec.js` | Unauthenticated returns 401 for all protected endpoints, EMPLOYEE role 403 on admin routes |
| `timesheets.spec.js` | Timesheets page basics, week selector, stat strip labels, non-existent ID handling |
| `timesheets-overtime.spec.js` | Create current-week timesheet, add WORK entry, overtime computation, copy previous week |

---

## Selector Strategy

**Always prefer semantic selectors** — they survive UI restyling:

```js
// ✅ Preferred
page.getByRole('button', { name: /sign in/i })
page.getByLabel(/email address/i)
page.getByRole('heading', { name: /employees/i })
page.getByText(/admin@timekeeper\.app/i)

// ⚠️ Only use when no semantic alternative exists
page.locator('.tabular-nums').first()
```

**Never** use `data-testid` attributes unless you add them to the component first.  
**Never** assert on exact toast message text — assert on URL or database state instead (toast DOM is implementation-specific).

---

## Writing New Specs

### File naming

```
tests/e2e/<feature>.spec.js
```

### Boilerplate template

```js
import { test, expect } from '@playwright/test'

const ADMIN_EMAIL    = 'admin@timekeeper.app'
const ADMIN_PASSWORD = 'Admin123!'
const API            = 'http://localhost:8080/api/v1'

async function login(page) {
  await page.goto('/login')
  await page.getByLabel(/email address/i).fill(ADMIN_EMAIL)
  await page.getByLabel(/password/i).fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await page.waitForURL(/\/dashboard/, { timeout: 10_000 })
}

test.describe('Feature — scenario group', () => {
  test.beforeEach(async ({ page }) => { await login(page) })

  test('meaningful description', async ({ page }) => {
    await page.goto('/feature-route')
    await expect(page.getByRole('heading', { name: /feature/i })).toBeVisible({ timeout: 5000 })
  })
})
```

### Stateful tests (avoid ordering collisions)

Tests that **mutate state** (submit timesheet, apply leave, create employee) must each navigate to a **fresh URL** at the start. Never rely on state left by a previous test — `fullyParallel: false` and `retries: 1` are set in `playwright.config.js` but test isolation is still required.

```js
// ✅ Each mutating test starts fresh
test.beforeEach(async ({ page }) => {
  await login(page)
  await page.goto('/timesheets/new')   // fresh navigation per test
})
```

---

## API-Layer Tests (via `page.request`)

For access-control and validation tests, call the backend API directly without navigating the UI:

```js
test('unauthenticated POST /leaves returns 401', async ({ page }) => {
  const res = await page.request.post(`${API}/leaves`, {
    headers: { 'Content-Type': 'application/json' },
    data: { startDate: '2027-01-01', endDate: '2027-01-02', leaveType: 'SICK', reason: 'test' },
  })
  expect(res.status()).toBe(401)
})
```

Always test the actual HTTP status code and, where appropriate, `body.success === false`.

---

## Configuration Reference

**`playwright.config.js`** key settings:

| Setting | Value | Notes |
|---|---|---|
| `testDir` | `./tests/e2e` | Vitest's exclude also targets this folder |
| `fullyParallel` | `false` | Tests within a file run serially |
| `workers` | `2` | Two spec files can run at once |
| `retries` | `1` | One retry on failure (CI-resilient) |
| `timeout` | `30_000` ms | Per-test timeout |
| `baseURL` | `$BASE_URL \|\| localhost:5173` | Override for different port |
| `screenshot` | `only-on-failure` | Saved to `test-results/` |
| `video` | `retain-on-failure` | Saved to `test-results/` |

---

## Debugging Failures

1. **Run in headed mode** to watch the browser:
   ```powershell
   npx playwright test --headed tests/e2e/auth.spec.js
   ```

2. **Open Playwright trace viewer** after a failure:
   ```powershell
   npx playwright show-trace test-results/<test-name>/trace.zip
   ```

3. **Check screenshots** in `frontend/test-results/` — saved automatically on failure.

4. **Timeout errors** — increase `{ timeout: 5000 }` on the failing assertion, or check that the backend is actually running on port 8080.

5. **401 unexpected on UI tests** — the seed account password may have changed. Re-seed the database or reset the admin password.

6. **Port conflict** — if 5173 is in use, start Vite on another port and set `$env:BASE_URL`:
   ```powershell
   npm run dev -- --port 5174
   $env:BASE_URL="http://localhost:5174"
   npx playwright test
   ```

---

## Backend Unit / Integration Tests (for reference)

These run independently of both servers — no live DB or browser needed:

```powershell
cd backend

# All tests (unit + integration, uses H2 in-memory DB)
mvn test

# Single service test class
mvn test -Dtest=ReportServiceTest

# Integration tests only
mvn test -Dtest="*IntegrationTest,*ConcurrentSubmitTest"
```

Test profile: `application-test.properties` uses `jdbc:h2:mem:testdb` with `ddl-auto=create-drop`.
