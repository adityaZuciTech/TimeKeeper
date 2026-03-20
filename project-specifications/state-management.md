# TimeKeeper — State Management

---

## Overview

TimeKeeper uses **Redux Toolkit** for global application state. State is organized into 7 domain slices, each co-located with its async thunks and selectors in the `features/` directory.

Local component state (`useState`) is used for UI-only state: form inputs, modal visibility, loading flags for single-component operations, and other ephemeral values that don't need to be shared.

---

## Redux Store Configuration

**File:** `frontend/src/app/store.js`

```js
import { configureStore } from '@reduxjs/toolkit'
import authReducer       from '../features/auth/authSlice'
import employeeReducer   from '../features/employees/employeeSlice'
import projectReducer    from '../features/projects/projectSlice'
import timesheetReducer  from '../features/timesheets/timesheetSlice'
import departmentReducer from '../features/departments/departmentSlice'
import leaveReducer      from '../features/leaves/leaveSlice'
import holidayReducer    from '../features/holidays/holidaySlice'

export const store = configureStore({
  reducer: {
    auth:        authReducer,
    employees:   employeeReducer,
    projects:    projectReducer,
    timesheets:  timesheetReducer,
    departments: departmentReducer,
    leaves:      leaveReducer,
    holidays:    holidayReducer,
  },
})
```

The store is provided to the app via `<Provider store={store}>` in `main.jsx`.

---

## Slices

### `auth` — `features/auth/authSlice.js`

**Initial state:**
```js
{
  user: null | { id, name, email, role, departmentId, departmentName, managerId },
  token: null | string,
  loading: false,
  error: null,
}
```

**Bootstrap from localStorage:** On slice initialization, `tk_token` and `tk_user` are read from `localStorage` and set as initial state. This persists login across page refreshes without a separate persistence library.

**Async Thunks:**

| Thunk | Description |
|---|---|
| `login(credentials)` | `POST /auth/login` → stores token + user in state and localStorage |
| `changePassword(data)` | `POST /auth/change-password` |

**Synchronous Reducers:**

| Action | Effect |
|---|---|
| `logout()` | Clears `user`, `token`; removes `tk_token` and `tk_user` from localStorage |
| `clearError()` | Resets `error` to null |

**Selectors:**

| Selector | Returns |
|---|---|
| `selectCurrentUser` | `state.auth.user` |
| `selectIsAuthenticated` | `!!state.auth.token` |
| `selectAuthLoading` | `state.auth.loading` |
| `selectAuthError` | `state.auth.error` |

---

### `employees` — `features/employees/employeeSlice.js`

**Initial state:**
```js
{
  list: [],   // all employees (Admin-facing)
  team: [],   // manager's direct reports
  loading: false,
  error: null,
}
```

**Async Thunks:**

| Thunk | Description |
|---|---|
| `fetchEmployees({ departmentId?, status? })` | `GET /employees` |
| `fetchTeam(managerId)` | `GET /employees/{managerId}/team` |
| `createEmployee(data)` | `POST /employees` → appends to `list` |
| `updateEmployee({ id, data })` | `PUT /employees/{id}` → replaces in `list` |
| `updateEmployeeStatus({ id, status })` | `PATCH /employees/{id}/status` → replaces in `list` |

**Selectors:**

| Selector | Returns |
|---|---|
| `selectEmployees` | `state.employees.list` |
| `selectTeam` | `state.employees.team` |
| `selectEmployeesLoading` | `state.employees.loading` |

---

### `departments` — `features/departments/departmentSlice.js`

**Initial state:**
```js
{
  list: [],
  loading: false,
  error: null,
}
```

**Async Thunks:**

| Thunk | Description |
|---|---|
| `fetchDepartments()` | `GET /departments` |
| `createDepartment(data)` | `POST /departments` → appends to `list` |
| `updateDepartment({ id, data })` | `PUT /departments/{id}` → replaces in `list` |
| `updateDepartmentStatus({ id, status })` | `PATCH /departments/{id}/status` → replaces in `list` |

**Selectors:**

| Selector | Returns |
|---|---|
| `selectDepartments` | `state.departments.list` |
| `selectDepartmentsLoading` | `state.departments.loading` |

---

### `projects` — `features/projects/projectSlice.js`

**Initial state:**
```js
{
  list: [],
  loading: false,
  error: null,
}
```

**Async Thunks:**

| Thunk | Description |
|---|---|
| `fetchProjects({ departmentId?, status? })` | `GET /projects` |
| `createProject(data)` | `POST /projects` → appends to `list` |
| `updateProject({ id, data })` | `PUT /projects/{id}` → replaces in `list` |
| `updateProjectStatus({ id, status })` | `PATCH /projects/{id}/status` → replaces in `list` |

**Selectors:**

| Selector | Returns |
|---|---|
| `selectProjects` | `state.projects.list` |
| `selectProjectsLoading` | `state.projects.loading` |
| `selectActiveProjects` | `list.filter(p => p.status === 'ACTIVE')` |

---

### `timesheets` — `features/timesheets/timesheetSlice.js`

**Initial state:**
```js
{
  myTimesheets: [],       // last 5 timesheets for current user
  currentTimesheet: null, // currently viewed/edited timesheet (with entries)
  loading: false,
  entriesLoading: false,  // separate flag for entry mutation operations
  error: null,
}
```

**Async Thunks:**

| Thunk | Description |
|---|---|
| `fetchMyTimesheets()` | `GET /timesheets/my` |
| `fetchTimesheetById(id)` | `GET /timesheets/{id}` |
| `createTimesheet(data)` | `POST /timesheets` → sets `currentTimesheet` |
| `submitTimesheet(id)` | `POST /timesheets/{id}/submit` → updates status in state |
| `addEntry({ timesheetId, data })` | `POST /timesheets/{id}/entries` → refreshes `currentTimesheet` |
| `updateEntry({ entryId, data })` | `PUT /timesheets/entries/{id}` → refreshes `currentTimesheet` |
| `deleteEntry(entryId)` | `DELETE /timesheets/entries/{id}` → refreshes `currentTimesheet` |

**Synchronous Reducers:**

| Action | Effect |
|---|---|
| `clearError()` | Resets `error` to null |
| `clearCurrentTimesheet()` | Sets `currentTimesheet` to null (used on unmount) |

**Selectors:**

| Selector | Returns |
|---|---|
| `selectMyTimesheets` | `state.timesheets.myTimesheets` |
| `selectCurrentTimesheet` | `state.timesheets.currentTimesheet` |
| `selectTimesheetsLoading` | `state.timesheets.loading` |
| `selectEntriesLoading` | `state.timesheets.entriesLoading` |
| `selectTimesheetError` | `state.timesheets.error` |

---

### `leaves` — `features/leaves/leaveSlice.js`

**Initial state:**
```js
{
  myLeaves: [],     // current user's leaves
  teamLeaves: [],   // manager's view of team leave requests
  loading: false,
  error: null,
}
```

**Async Thunks:**

| Thunk | Description |
|---|---|
| `applyLeave(data)` | `POST /leaves` → prepends to `myLeaves` |
| `fetchMyLeaves()` | `GET /leaves/my` |
| `fetchTeamLeaves()` | `GET /leaves/team` |
| `approveLeave({ id, note })` | `PATCH /leaves/{id}/approve` → updates in both lists |
| `rejectLeave({ id, note })` | `PATCH /leaves/{id}/reject` → updates in both lists |

**Selectors:**

| Selector | Returns |
|---|---|
| `selectMyLeaves` | `state.leaves.myLeaves` |
| `selectTeamLeaves` | `state.leaves.teamLeaves` |
| `selectLeavesLoading` | `state.leaves.loading` |

---

### `holidays` — `features/holidays/holidaySlice.js`

**Initial state:**
```js
{
  list: [],
  loading: false,
  error: null,
}
```

**Async Thunks:**

| Thunk | Description |
|---|---|
| `fetchHolidays()` | `GET /holidays` |
| `createHoliday(data)` | `POST /holidays` → appends to `list`, sorted by date |
| `deleteHoliday(id)` | `DELETE /holidays/{id}` → filters from `list` |

**Selectors:**

| Selector | Returns |
|---|---|
| `selectHolidays` | `state.holidays.list` |
| `selectHolidaysLoading` | `state.holidays.loading` |

---

## localStorage Usage

Three keys are used in `localStorage` for client-side persistence:

| Key | Value | Set By | Cleared By |
|---|---|---|---|
| `tk_token` | JWT string | `auth/login` fulfilled | `logout()` reducer, 401 Axios interceptor |
| `tk_user` | JSON-stringified user object | `auth/login` fulfilled | `logout()` reducer, 401 Axios interceptor |
| `sidebar-collapsed` | `"true"` or `"false"` | `Sidebar.jsx` on toggle | `Sidebar.jsx` on toggle |

**Security note:** Storing JWTs in `localStorage` is vulnerable to XSS. For production, migrate to `httpOnly` cookies. This is an accepted tradeoff in the current development configuration.

---

## Axios HTTP Client (`services/apiClient.js`)

All Redux thunks call service functions that use a shared Axios instance:

```js
const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Request interceptor: attach JWT
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('tk_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Response interceptor: global 401 handler
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('tk_token')
      localStorage.removeItem('tk_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

The 401 response interceptor handles expired/invalid tokens globally — no per-page logout logic needed.

---

## Redux vs Local State — Decision Guide

| Concern | Storage | Reason |
|---|---|---|
| Auth token + user | Redux + localStorage | Needed across all pages + survives refresh |
| Employee/department/project lists | Redux | Shared between multiple pages (e.g., Projects list used in Timesheet entry, Department filters in Employees) |
| Current timesheet + entries | Redux | Passed between `Timesheets.jsx` → `TimesheetDetail.jsx` |
| Leaves (my + team) | Redux | Shared between `MyLeaves` and team management views |
| Holidays list | Redux | Required by both Holidays page and Leave form for date validation |
| Form inputs (name, email, etc.) | Local state | Ephemeral, single-component |
| Modal open/close state | Local state | No cross-component dependency |
| Inline loading flags (save button) | Local state | Fine-grained per-action, not slice-level |
| Sidebar collapsed state | localStorage only | Purely UI preference, no Redux needed |
| Notification panel | Local state | Hardcoded mock data, no backend |

---

## Patterns

### Async Thunk Error Handling
All thunks use `rejectWithValue` to pass error messages to the slice:
```js
catch (err) {
  return rejectWithValue(err.response?.data?.message || 'Default error message')
}
```
Slices capture the error in `state.error` on `rejected`, and pages display it via `toast.error()`.

### Optimistic List Updates
Create/update/delete operations update the Redux list immediately on `fulfilled` (without re-fetching the entire list):
```js
.addCase(createDepartment.fulfilled, (state, action) => {
  state.list = [...state.list, action.payload]
})
.addCase(updateDepartment.fulfilled, (state, action) => {
  state.list = state.list.map(d => d.id === action.payload.id ? action.payload : d)
})
```

### Selector Memoization
All selectors are plain function selectors (no `createSelector`). Component-level memoization uses `useMemo` when derived data is computed from slice state.
