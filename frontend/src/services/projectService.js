import apiClient from './apiClient'

export const projectService = {
  create: (data) => apiClient.post('/projects', data),
  getAll: (params) => apiClient.get('/projects', { params }),
  getById: (id) => apiClient.get(`/projects/${id}`),
  update: (id, data) => apiClient.put(`/projects/${id}`, data),
  updateStatus: (id, status) => apiClient.patch(`/projects/${id}/status`, { status }),
}
