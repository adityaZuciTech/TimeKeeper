# TimeKeeper — User Roles & Permissions

---

## Role Overview

TimeKeeper implements **Role-Based Access Control (RBAC)** with three fixed roles. Roles are assigned at employee creation by an Admin and stored in the `employees.role` column.

```
EMPLOYEE  ←  base role
MANAGER   ←  inherits all Employee capabilities
ADMIN     ←  inherits all Manager + Employee capabilities + org-level access
```

---

## Role: EMPLOYEE

### Who uses this role
Regular team members who track their own working hours.

### What they can do

| Module | Capabilities |
|---|---|
| **Auth** | Login, logout, change password |
| **Dashboard** | View own recent timesheets, hours summary |
| **Timesheets** | Create weekly timesheet, add/edit/delete time entries (DRAFT only), submit timesheet |
| **My Leaves** | Apply for leave (SICK/CASUAL/VACATION), view own leave history and balance |
| **Holidays** | View all holidays (read-only) |
| **Profile** | View own profile details |

### What they cannot do
- View other employees' timesheets
- Approve/reject any leave
- Create/manage departments, projects, or employees
- View organization-wide reports
- Send reminder emails

---

## Role: MANAGER

### Who uses this role
Team leads who oversee a group of employees. Identified by employees having `manager_id` pointing to this user.

### What they can do (in addition to EMPLOYEE)

| Module | Capabilities |
|---|---|
| **Team** | View all team members (employees where `manager_id = this.id`) |
| **Team Timesheets** | View any team member's timesheets and time entries |
| **Team Leaves** | View team leave requests, approve or reject with optional note |
| **Reports** | View team utilization report, employee timesheet reports |

### What they cannot do
- Create/edit/delete employees, departments, or projects
- View org-wide (all departments) analytics
- Send organization-wide email reminders
- Export PDF organization reports

---

## Role: ADMIN

### Who uses this role
HR, operations, or platform administrators with full system access.

### What they can do (in addition to MANAGER)

| Module | Capabilities |
|---|---|
| **Employees** | Create new employees, update employee details, activate/deactivate employees |
| **Departments** | Create, update, list all departments |
| **Projects** | Create, update project details and status (ACTIVE/ON_HOLD/COMPLETED) |
| **Holidays** | Create and delete system-wide holidays |
| **Organization** | Full org dashboard: stat cards, weekly trend chart, department distribution pie chart |
| **Reports** | Department utilization report, project effort report |
| **PDF Export** | Export 4-page professional PDF organization report |
| **CSV Export** | Export department utilization as CSV |
| **Reminders** | Manually trigger weekly timesheet reminder emails to all active employees |

---

## Permission Matrix

| API Endpoint | EMPLOYEE | MANAGER | ADMIN |
|---|:---:|:---:|:---:|
| `POST /auth/login` | ✅ | ✅ | ✅ |
| `POST /auth/change-password` | ✅ | ✅ | ✅ |
| `GET /timesheets` (own) | ✅ | ✅ | ✅ |
| `POST /timesheets` | ✅ | ✅ | ✅ |
| `POST /timesheets/{id}/submit` | ✅ | ✅ | ✅ |
| `POST /timesheets/{id}/entries` | ✅ | ✅ | ✅ |
| `GET /employees/{managerId}/team` | ❌ | ✅ | ✅ |
| `GET /employees/{id}/timesheets` | ❌ | ✅ | ✅ |
| `GET /leaves/team` | ❌ | ✅ | ✅ |
| `PATCH /leaves/{id}/approve` | ❌ | ✅ | ✅ |
| `PATCH /leaves/{id}/reject` | ❌ | ✅ | ✅ |
| `GET /reports/team-utilization` | ❌ | ✅ | ✅ |
| `GET /employees` | ❌ | ❌ | ✅ |
| `POST /employees` | ❌ | ❌ | ✅ |
| `PUT /employees/{id}` | ❌ | ❌ | ✅ |
| `PATCH /employees/{id}/status` | ❌ | ❌ | ✅ |
| `POST /departments` | ❌ | ❌ | ✅ |
| `POST /projects` | ❌ | ❌ | ✅ |
| `DELETE /projects/{id}` | ❌ | ❌ | ✅ |
| `POST /holidays` | ❌ | ❌ | ✅ |
| `DELETE /holidays/{id}` | ❌ | ❌ | ✅ |
| `GET /reports/department-utilization` | ❌ | ❌ | ✅ |
| `POST /reports/export-pdf` | ❌ | ❌ | ✅ |
| `POST /admin/reminders/timesheets` | ❌ | ❌ | ✅ |

---

## Security Implementation

- **Mechanism**: JWT Bearer tokens (stateless, no server-side sessions)
- **Token storage**: `localStorage` under key `tk_token`
- **Token expiry**: 24 hours (`jwt.expiration=86400000`)
- **Method-level security**: `@PreAuthorize("hasRole('ADMIN')")` on all restricted endpoints
- **Account lock**: Employees with `status = INACTIVE` are rejected at authentication (`isAccountNonLocked()` returns false)
- **Password hashing**: BCrypt

---

## Route-Level Frontend Guards

Frontend uses a `ProtectedRoute` component that reads the authenticated user's role from Redux state and redirects unauthorized users to `/login` or `/dashboard`.

```
/login              → public (redirects to /dashboard if already logged in)
/dashboard          → all roles
/timesheets         → all roles
/timesheets/:id     → all roles
/leaves             → all roles
/holidays           → all roles
/profile            → all roles
/team               → MANAGER, ADMIN
/employees          → ADMIN only
/departments        → ADMIN only
/projects           → ADMIN only
/organization       → ADMIN only
```
