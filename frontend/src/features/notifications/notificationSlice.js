import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import notificationService from '../../services/notificationService'

export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const response = await notificationService.getMyNotifications()
      return response.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch notifications')
    }
  }
)

export const markNotificationRead = createAsyncThunk(
  'notifications/markRead',
  async (id, { rejectWithValue }) => {
    try {
      const response = await notificationService.markAsRead(id)
      return response.data.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to mark notification as read')
    }
  }
)

export const markAllNotificationsRead = createAsyncThunk(
  'notifications/markAllRead',
  async (_, { rejectWithValue }) => {
    try {
      await notificationService.markAllAsRead()
      return true
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to mark all as read')
    }
  }
)

export const markSectionRead = createAsyncThunk(
  'notifications/markSectionRead',
  async (section, { rejectWithValue, getState }) => {
    const state = getState()
    const hasUnread = state.notifications.notifications.some(
      (n) => !n.read && n.targetSection === section
    )
    if (!hasUnread) return section
    try {
      await notificationService.markSectionAsRead(section)
      return section
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to mark section as read')
    }
  }
)

function computeBadges(notifications) {
  return {
    timesheets:      notifications.filter((n) => !n.read && n.targetSection === 'TIMESHEET').length,
    team_timesheets: notifications.filter((n) => !n.read && n.targetSection === 'TEAM_TIMESHEET').length,
    personal_leaves: notifications.filter((n) => !n.read && n.targetSection === 'LEAVE').length,
    team_leaves:     notifications.filter((n) => !n.read && n.targetSection === 'TEAM_LEAVE').length,
    team:            notifications.filter((n) => !n.read && n.targetSection === 'TEAM').length,
  }
}

const notificationSlice = createSlice({
  name: 'notifications',
  initialState: {
    notifications: [],
    unreadCount: 0,
    badges: { timesheets: 0, team_timesheets: 0, personal_leaves: 0, team_leaves: 0, team: 0 },
    loading: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false
        state.notifications = action.payload?.notifications ?? []
        state.unreadCount = action.payload?.unreadCount ?? 0
        state.badges = computeBadges(state.notifications)
      })
      .addCase(fetchNotifications.rejected, (state) => {
        state.loading = false
      })
      .addCase(markNotificationRead.fulfilled, (state, action) => {
        const updated = action.payload
        const idx = state.notifications.findIndex((n) => n.id === updated.id)
        if (idx !== -1 && !state.notifications[idx].read) {
          state.notifications[idx] = updated
          state.unreadCount = Math.max(0, state.unreadCount - 1)
          state.badges = computeBadges(state.notifications)
        }
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.notifications = state.notifications.map((n) => ({ ...n, read: true }))
        state.unreadCount = 0
        state.badges = { timesheets: 0, team_timesheets: 0, personal_leaves: 0, team_leaves: 0, team: 0 }
      })
      .addCase(markSectionRead.fulfilled, (state, action) => {
        const section = action.payload
        state.notifications = state.notifications.map((n) =>
          !n.read && n.targetSection === section ? { ...n, read: true } : n
        )
        state.unreadCount = state.notifications.filter((n) => !n.read).length
        state.badges = computeBadges(state.notifications)
      })
  },
})

export default notificationSlice.reducer

export const selectNotifications = (state) => state.notifications.notifications
export const selectUnreadCount = (state) => state.notifications.unreadCount
export const selectBadges = (state) => state.notifications.badges
export const selectNotificationsLoading = (state) => state.notifications.loading
