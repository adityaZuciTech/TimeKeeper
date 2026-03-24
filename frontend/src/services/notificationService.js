import apiClient from './apiClient'

const notificationService = {
  getMyNotifications: () => apiClient.get('/notifications/my'),
  markAsRead: (id) => apiClient.patch(`/notifications/${id}/read`),
  markAllAsRead: () => apiClient.patch('/notifications/read-all'),
  markSectionAsRead: (section) => apiClient.patch(`/notifications/section/${section}/read-all`),
}

export default notificationService
