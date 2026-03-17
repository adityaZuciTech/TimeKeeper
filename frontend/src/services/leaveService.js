import apiClient from './apiClient'

export const leaveService = {
  applyLeave: (data) => apiClient.post('/leaves', data),
  getMyLeaves: () => apiClient.get('/leaves/my'),
  getTeamLeaves: () => apiClient.get('/leaves/team'),
  approveLeave: (id, note) => apiClient.patch(`/leaves/${id}/approve`, { note }),
  rejectLeave: (id, note) => apiClient.patch(`/leaves/${id}/reject`, { note }),
}
