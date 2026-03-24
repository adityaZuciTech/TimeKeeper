import axios from 'axios'

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
// A 401 on any other endpoint means the session expired; redirect to login.
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login')
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('tk_token')
      localStorage.removeItem('tk_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default apiClient
