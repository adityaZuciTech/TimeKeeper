import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice'
import employeeReducer from '../features/employees/employeeSlice'
import projectReducer from '../features/projects/projectSlice'
import timesheetReducer from '../features/timesheets/timesheetSlice'
import departmentReducer from '../features/departments/departmentSlice'
import leaveReducer from '../features/leaves/leaveSlice'
import holidayReducer from '../features/holidays/holidaySlice'
import notificationReducer from '../features/notifications/notificationSlice'
import { resetAllState } from './actions'

// Re-export so existing imports of resetAllState from './store' still work.
export { resetAllState }

const sliceReducers = {
  auth: authReducer,
  employees: employeeReducer,
  projects: projectReducer,
  timesheets: timesheetReducer,
  departments: departmentReducer,
  leaves: leaveReducer,
  holidays: holidayReducer,
  notifications: notificationReducer,
}

function rootReducer(state, action) {
  if (action.type === resetAllState.type) {
    // Pass undefined so every slice reducer returns its own initialState
    return Object.fromEntries(
      Object.entries(sliceReducers).map(([key, reducer]) => [key, reducer(undefined, action)])
    )
  }
  return Object.fromEntries(
    Object.entries(sliceReducers).map(([key, reducer]) => [key, reducer(state?.[key], action)])
  )
}

export const store = configureStore({ reducer: rootReducer })
