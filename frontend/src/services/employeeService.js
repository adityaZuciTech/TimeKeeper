import apiClient from './apiClient'

export const employeeService = {
  create: (data) => apiClient.post('/employees', data),
  getAll: (params) => apiClient.get('/employees', { params }),
  getById: (id) => apiClient.get(`/employees/${id}`),
  update: (id, data) => apiClient.put(`/employees/${id}`, data),
  updateStatus: (id, status) => apiClient.patch(`/employees/${id}/status`, { status }),
  getTeam: (managerId) => apiClient.get(`/employees/${managerId}/team`),
  getTimesheets: (employeeId) => apiClient.get(`/employees/${employeeId}/timesheets`),
}
