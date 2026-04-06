import axios from 'axios'
import { resetAllState } from '../app/actions'

// Store is injected after creation (main.jsx calls injectStore) to avoid a
// circular dependency: store → authSlice → authService → apiClient → store.
let _store
export function injectStore(store) {
  _store = store
}

const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('tk_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 globally — but NOT for the login endpoint itself.
// A 401 on /auth/login means wrong credentials; the Login component handles that inline.
// A 401 on any other endpoint means the session expired.
// Dispatching resetAllState clears all Redux slices (prevents stale data between sessions).
// Using window.location.href for navigation here because apiClient has no access to the
// React Router navigate() hook; the full reload is intentional — it also clears any
// in-memory SPA state that resetAllState does not reach (e.g. component-local useState).
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login')
    if (error.response?.status === 401 && !isLoginRequest) {
      _store?.dispatch(resetAllState())
      localStorage.removeItem('tk_token')
      localStorage.removeItem('tk_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient