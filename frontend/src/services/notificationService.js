import apiClient from './apiClient'

const notificationService = {
  getMyNotifications: () => apiClient.get('/notifications/my'),
  markAsRead: (id) => apiClient.patch(`/notifications/${id}/read`),
  markAllAsRead: () => apiClient.patch('/notifications/read-all'),
  markSectionAsRead: (section) => apiClient.patch(`/notifications/section/${section}/read-all`),
  deleteOne: (id) => apiClient.delete(`/notifications/${id}`),
  clearAll: () => apiClient.delete('/notifications/clear-all'),
}

export default notificationService
