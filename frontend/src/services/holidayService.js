import apiClient from './apiClient'

export const holidayService = {
  getAll: () => apiClient.get('/holidays'),
  create: (data) => apiClient.post('/holidays', data),
  delete: (id) => apiClient.delete(`/holidays/${id}`),
}
