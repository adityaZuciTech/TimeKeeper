import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { authService } from '../../services/authService'

// Load persisted auth from localStorage
const storedToken = localStorage.getItem('tk_token')
const storedUser = localStorage.getItem('tk_user')

export const login = createAsyncThunk('auth/login', async (credentials, { rejectWithValue }) => {
  try {
    const response = await authService.login(credentials)
    return response.data.data
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Login failed')
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
    await authService.changePassword(data)
    return true
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to change password')
  }
})

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: storedUser ? JSON.parse(storedUser) : null,
    token: storedToken || null,
    loading: false,
    error: null,
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
        state.error = action.payload
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
