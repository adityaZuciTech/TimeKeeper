import apiClient from './apiClient'

export const departmentService = {
  create: (data) => apiClient.post('/departments', data),
  getAll: () => apiClient.get('/departments'),
  getById: (id) => apiClient.get(`/departments/${id}`),
  update: (id, data) => apiClient.put(`/departments/${id}`, data),
  updateStatus: (id, status) => apiClient.patch(`/departments/${id}/status`, { status }),
  getEmployees: (id) => apiClient.get(`/departments/${id}/employees`),
}
