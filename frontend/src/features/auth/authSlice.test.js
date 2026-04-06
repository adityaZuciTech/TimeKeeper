import { configureStore } from '@reduxjs/toolkit'
import authReducer, {
  login,
  logoutAsync,
  logout,
  clearError,
  selectCurrentUser,
  selectIsAuthenticated,
} from './authSlice'
import { resetAllState } from '../../app/actions'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// ── helpers ──────────────────────────────────────────────────────────────────

function makeStore(preloadedAuth = {}) {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      auth: {
        user: null,
        token: null,
        loading: false,
        error: null,
        retryAfter: 0,
        ...preloadedAuth,
      },
    },
  })
}

function buildJwt(expOffsetSeconds) {
  const payload = { exp: Math.floor(Date.now() / 1000) + expOffsetSeconds, sub: 'test' }
  const encoded = btoa(JSON.stringify(payload))
  return `header.${encoded}.sig`
}

// ── AUTH-01: login.fulfilled sets token + user, persists to localStorage ─────

describe('authSlice', () => {
  beforeEach(() => {
    localStorage.clear()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('AUTH-01: login.fulfilled sets token, user and persists to localStorage', () => {
    const store = makeStore()
    const payload = {
      id: 'emp_1', name: 'Alice', email: 'alice@example.com',
      role: 'EMPLOYEE', token: buildJwt(3600),
      departmentId: 'dept_1', departmentName: 'Engineering', managerId: null,
    }

    store.dispatch({ type: login.fulfilled.type, payload })

    const state = store.getState().auth
    expect(state.token).toBe(payload.token)
    expect(state.user.id).toBe('emp_1')
    expect(state.loading).toBe(false)
    expect(localStorage.getItem('tk_token')).toBe(payload.token)
    expect(JSON.parse(localStorage.getItem('tk_user'))).toMatchObject({ id: 'emp_1' })
  })

  // ── AUTH-02: login.rejected sets error message ─────────────────────────────

  it('AUTH-02: login.rejected sets error, token stays null', () => {
    const store = makeStore()

    store.dispatch({
      type: login.rejected.type,
      payload: { message: 'Invalid credentials' },
    })

    const state = store.getState().auth
    expect(state.error).toBe('Invalid credentials')
    expect(state.token).toBeNull()
    expect(state.loading).toBe(false)
  })

  // ── AUTH-03: 429 rejected sets retryAfter ─────────────────────────────────

  it('AUTH-03: login.rejected with retryAfter sets retryAfter', () => {
    const store = makeStore()

    store.dispatch({
      type: login.rejected.type,
      payload: { message: 'Too many login attempts.', retryAfter: 60 },
    })

    const state = store.getState().auth
    expect(state.retryAfter).toBe(60)
  })

  // ── AUTH-04: logout reducer clears state + localStorage ───────────────────

  it('AUTH-04: logout reducer clears user, token and localStorage', () => {
    localStorage.setItem('tk_token', 'some-token')
    localStorage.setItem('tk_user', JSON.stringify({ id: 'emp_1' }))

    const store = makeStore({ user: { id: 'emp_1' }, token: 'some-token' })
    store.dispatch(logout())

    const state = store.getState().auth
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(localStorage.getItem('tk_token')).toBeNull()
    expect(localStorage.getItem('tk_user')).toBeNull()
  })

  // ── AUTH-05: logoutAsync.fulfilled clears state ───────────────────────────

  it('AUTH-05: logoutAsync.fulfilled clears user and token', () => {
    const store = makeStore({ user: { id: 'emp_1' }, token: 'tok' })

    store.dispatch({ type: logoutAsync.fulfilled.type })

    const state = store.getState().auth
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
  })

  // ── AUTH-06: clearError resets error ─────────────────────────────────────

  it('AUTH-06: clearError sets error to null', () => {
    const store = makeStore({ error: 'some error' })
    store.dispatch(clearError())
    expect(store.getState().auth.error).toBeNull()
  })

// ── AUTH-07: resetAllState returns initial state ──────────────────────────

  it('AUTH-07: resetAllState returns initialState', () => {
    // resetAllState is handled by the root reducer, not authReducer alone.
    // Build a minimal root reducer that mimics store.js behaviour for just auth.
    const testStore = configureStore({
      reducer: (state = { auth: { user: null, token: null, loading: false, error: null, retryAfter: 0 } }, action) => {
        if (action.type === resetAllState.type) {
          return { auth: authReducer(undefined, action) }
        }
        return { auth: authReducer(state.auth, action) }
      },
      preloadedState: {
        auth: { user: { id: 'emp_1' }, token: 'tok', loading: false, error: 'err', retryAfter: 0 },
      },
    })

    testStore.dispatch(resetAllState())

    const state = testStore.getState().auth
    expect(state.user).toBeNull()
    expect(state.token).toBeNull()
    expect(state.error).toBeNull()
  })
})
