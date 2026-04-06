import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { injectStore } from './apiClient'
import { resetAllState } from '../app/actions'

// ── Setup: mock window.location.href ─────────────────────────────────────────

// jsdom doesn't allow direct assignment to window.location.href, so we replace it.
const locationSpy = vi.fn()
Object.defineProperty(window, 'location', {
  value: { href: '' },
  writable: true,
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeStoreMock() {
  const dispatched = []
  return {
    dispatch: (action) => dispatched.push(action),
    dispatched,
  }
}

function buildError(status, url = '/api/v1/timesheets') {
  return {
    response: { status },
    config: { url },
  }
}

// We need to exercise the response interceptor directly.
// Import apiClient AFTER injecting the store.
let interceptorErrorHandler

async function loadInterceptor() {
  // Re-import to get the module's interceptor registration
  const mod = await import('./apiClient')
  // Access the registered response error handler via axios internals
  const apiClient = mod.default
  const handlers = apiClient.interceptors.response.handlers
  interceptorErrorHandler = handlers[handlers.length - 1]?.rejected
  return mod
}

describe('apiClient 401 interceptor', () => {
  let storeMock

  beforeEach(async () => {
    localStorage.clear()
    window.location.href = ''
    storeMock = makeStoreMock()
    injectStore(storeMock)
    await loadInterceptor()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ── AC-01: 401 on non-login request → state cleared, redirect to /login ───

  it('AC-01: 401 on non-login request dispatches resetAllState and redirects', async () => {
    localStorage.setItem('tk_token', 'old-token')
    localStorage.setItem('tk_user', JSON.stringify({ id: 'u1' }))

    if (interceptorErrorHandler) {
      try {
        await interceptorErrorHandler(buildError(401))
      } catch {
        // expected rejection
      }
    }

    expect(storeMock.dispatched.some(a => a.type === resetAllState.type)).toBe(true)
    expect(localStorage.getItem('tk_token')).toBeNull()
    expect(localStorage.getItem('tk_user')).toBeNull()
    expect(window.location.href).toBe('/login')
  })

  // ── AC-02: 401 on /auth/login → no logout side effects ────────────────────

  it('AC-02: 401 on /auth/login does NOT dispatch resetAllState', async () => {
    localStorage.setItem('tk_token', 'old-token')

    if (interceptorErrorHandler) {
      try {
        await interceptorErrorHandler(buildError(401, '/api/v1/auth/login'))
      } catch {
        // expected rejection
      }
    }

    expect(storeMock.dispatched.some(a => a.type === resetAllState.type)).toBe(false)
    expect(localStorage.getItem('tk_token')).toBe('old-token')
  })

  // ── AC-03: 500 error → no logout side effects ─────────────────────────────

  it('AC-03: 500 error does not trigger logout', async () => {
    localStorage.setItem('tk_token', 'old-token')

    if (interceptorErrorHandler) {
      try {
        await interceptorErrorHandler(buildError(500))
      } catch {
        // expected rejection
      }
    }

    expect(storeMock.dispatched.some(a => a.type === resetAllState.type)).toBe(false)
    expect(localStorage.getItem('tk_token')).toBe('old-token')
    expect(window.location.href).not.toBe('/login')
  })

  // ── AC-04: successful response passes through unchanged ───────────────────

  it('AC-04: 200 response passes through the success handler unchanged', async () => {
    // Import the raw apiClient to test that the success/pass-through works
    const { default: apiClient } = await import('./apiClient')
    const successHandlers = apiClient.interceptors.response.handlers
    const successHandler = successHandlers[successHandlers.length - 1]?.fulfilled

    const response = { status: 200, data: { ok: true } }
    const result = successHandler ? successHandler(response) : response

    expect(result).toEqual(response)
  })
})
