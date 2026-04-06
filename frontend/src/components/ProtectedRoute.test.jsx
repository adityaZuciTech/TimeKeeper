import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice'
import ProtectedRoute from './ProtectedRoute'

// ── helpers ──────────────────────────────────────────────────────────────────

function makeStore(authState) {
  return configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: authState },
  })
}

function renderWithRouter(store, protectedRoles) {
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/dashboard" element={<div>Dashboard Page</div>} />
          <Route element={<ProtectedRoute roles={protectedRoles} />}>
            <Route path="/protected" element={<div>Protected Content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </Provider>
  )
}

// ── PR-01: unauthenticated user → redirected to /login ────────────────────

describe('ProtectedRoute', () => {
  it('PR-01: unauthenticated user is redirected to /login', () => {
    const store = makeStore({ user: null, token: null, loading: false, error: null, retryAfter: 0 })

    renderWithRouter(store)

    expect(screen.getByText('Login Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  // ── PR-02: EMPLOYEE visiting MANAGER-only route → redirected to /dashboard

  it('PR-02: EMPLOYEE visiting MANAGER-only route is redirected to /dashboard', () => {
    const store = makeStore({
      user: { id: 'emp_1', role: 'EMPLOYEE' },
      token: 'valid-token',
      loading: false, error: null, retryAfter: 0,
    })

    renderWithRouter(store, ['MANAGER', 'ADMIN'])

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument()
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  // ── PR-03: MANAGER visiting MANAGER-allowed route → renders child ─────────

  it('PR-03: MANAGER visiting MANAGER-allowed route sees protected content', () => {
    const store = makeStore({
      user: { id: 'mgr_1', role: 'MANAGER' },
      token: 'valid-token',
      loading: false, error: null, retryAfter: 0,
    })

    renderWithRouter(store, ['MANAGER', 'ADMIN'])

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })

  // ── PR-04: ADMIN visiting any role-protected route → renders child ─────────

  it('PR-04: ADMIN visiting any role-protected route sees protected content', () => {
    const store = makeStore({
      user: { id: 'admin_1', role: 'ADMIN' },
      token: 'valid-token',
      loading: false, error: null, retryAfter: 0,
    })

    renderWithRouter(store, ['MANAGER', 'ADMIN'])

    expect(screen.getByText('Protected Content')).toBeInTheDocument()
  })
})
