import apiClient from './apiClient'

export const authService = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  logout: () => apiClient.post('/auth/logout'),
  changePassword: (data) => apiClient.post('/auth/change-password', data),
}
