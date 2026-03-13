import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice'
import employeeReducer from '../features/employees/employeeSlice'
import projectReducer from '../features/projects/projectSlice'
import timesheetReducer from '../features/timesheets/timesheetSlice'
import departmentReducer from '../features/departments/departmentSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    employees: employeeReducer,
    projects: projectReducer,
    timesheets: timesheetReducer,
    departments: departmentReducer,
  },
})
