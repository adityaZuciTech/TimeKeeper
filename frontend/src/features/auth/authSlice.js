import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authService } from '../../services/authService'

// Decode JWT and check expiry without verifying signature (server validates on every request)
function isTokenExpired(token) {
  try {
    // JWT payload is the second segment, base64url-encoded
    const base64Payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(base64Payload))
    if (!payload.exp) return true
    // Add 10-second clock skew buffer
    return payload.exp * 1000 < Date.now() - 10_000
  } catch {
    return true // malformed token → treat as expired
  }
}

// Load persisted auth from localStorage — only trust token if it hasn't expired
const storedToken = localStorage.getItem('tk_token')
const storedUser = localStorage.getItem('tk_user')
const tokenValid = !!storedToken && !isTokenExpired(storedToken)

// Clean up stale data immediately so subsequent renders never see expired state
if (!tokenValid) {
  localStorage.removeItem('tk_token')
  localStorage.removeItem('tk_user')
}

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const response = await authService.login(credentials)
    return response.data.data
  } catch (err) {
    if (err.response?.status === 429) {
      const retryAfter = parseInt(err.response.headers?.['retry-after'] || '60', 10)
      return rejectWithValue({ message: err.response.data?.message || 'Too many login attempts.', retryAfter })
    }
    return rejectWithValue({ message: err.response?.data?.message || 'Login failed' })
  }
})

export const logoutAsync = createAsyncThunk('auth/logout', async (_, { getState }) => {
  try {
    // Revoke the JWT on the server so it becomes immediately invalid
    await authService.logout()
  } catch {
    // Ignore errors — local state is always cleared regardless
  }
})

export const changePassword = createAsyncThunk('auth/changePassword', async (data, { rejectWithValue }) => {
  try {
    const response = await authService.changePassword(data)
    return response.data?.message || 'Password changed successfully'
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to change password')
  }
})

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: tokenValid && storedUser ? JSON.parse(storedUser) : null,
    token: tokenValid ? storedToken : null,
    loading: false,
    error: null,
    retryAfter: 0,
  },
  reducers: {
    logout: (state) => {
      state.user = null
      state.token = null
      localStorage.removeItem('tk_token')
      localStorage.removeItem('tk_user')
    },
    clearError: (state) => {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.loading = true
        state.error = null
        state.retryAfter = 0
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false
        state.token = action.payload.token
        state.user = {
          id: action.payload.id,
          name: action.payload.name,
          email: action.payload.email,
          role: action.payload.role,
          departmentId: action.payload.departmentId,
          departmentName: action.payload.departmentName,
          managerId: action.payload.managerId,
        }
        localStorage.setItem('tk_token', action.payload.token)
        localStorage.setItem('tk_user', JSON.stringify(state.user))
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload?.message ?? action.payload ?? 'Login failed'
        state.retryAfter = action.payload?.retryAfter ?? 0
      })
      .addCase(logoutAsync.fulfilled, (state) => {
        state.user = null
        state.token = null
        localStorage.removeItem('tk_token')
        localStorage.removeItem('tk_user')
      })
      .addCase(logoutAsync.rejected, (state) => {
        // Clear local state even if backend call failed
        state.user = null
        state.token = null
        localStorage.removeItem('tk_token')
        localStorage.removeItem('tk_user')
      })
  },
})

export const { logout, clearError } = authSlice.actions
export default authSlice.reducer

export const selectCurrentUser = (state) => state.auth.user
export const selectIsAuthenticated = (state) => !!state.auth.token
export const selectAuthLoading = (state) => state.auth.loading
export const selectAuthError = (state) => state.auth.error
export const selectRetryAfter = (state) => state.auth.retryAfter
