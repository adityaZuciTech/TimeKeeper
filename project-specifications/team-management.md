# TimeKeeper — Team Management Module

---

## Overview

The Team Management module gives Managers and Admins a structured view of the people they oversee. It enables visibility into team member profiles, their weekly timesheet submissions, and their working hours — without needing to individually search for employees.

---

## Key Concepts

| Concept | Description |
|---|---|
| **Team** | All employees where `manager_id = <current_manager's_id>` |
| **Team Timesheets** | A selected employee's timesheet list accessible by their manager |
| **Team Leaves** | Leave requests from team members, with approve/reject capability |

---

## User Flows

### Manager: View Team

```
1. Navigate to "Team"
2. See a card grid of all direct reports:
   - Name, role, department
   - Status badge (ACTIVE / INACTIVE)
   - Utilization progress bar (hours this week / 40h target)
3. Search by name or filter by department
4. Click on a member → view their timesheet list
5. Click into any timesheet week → full day-by-day detail
```

### Manager: Review Team Leaves

```
1. Navigate to "Team Leaves" (via Team page or sidebar)
2. See all leave requests from team members
3. Filter by status (PENDING / APPROVED / REJECTED)
4. Click Approve or Reject with optional note
```

### Admin: Manage All Employees

```
1. Navigate to "Employees"
2. See full list of all employees across all departments
3. Filter by department or status
4. Create new employee
5. Click employee → edit details (name, email, role, dept, manager)
6. Deactivate or reactivate employee
```

---

## Team Member Data

A team member card displays:
- Full name
- Role badge
- Department name
- Status (ACTIVE / INACTIVE)
- Hours this week (from timesheets)
- Utilization % (hours / 40h × 100)

---

## Data Model

### `employees` Table

| Column | Type | Notes |
|---|---|---|
| `id` | VARCHAR(50) | Format: `usr_` + 8-char UUID segment |
| `name` | VARCHAR(100) | Full name |
| `email` | VARCHAR(150) | Unique, used as login username |
| `password` | VARCHAR(255) | BCrypt hashed |
| `role` | VARCHAR(20) | `EMPLOYEE`, `MANAGER`, `ADMIN` |
| `department_id` | VARCHAR(50) | FK → departments.id (nullable) |
| `manager_id` | VARCHAR(50) | FK → employees.id (self-reference, nullable) |
| `status` | VARCHAR(20) | `ACTIVE` or `INACTIVE` |
| `created_at` | TIMESTAMP | Auto-set on insert |

---

## API Endpoints

### `GET /api/v1/employees/{managerId}/team`
Get all employees reporting to the specified manager.

**Auth:** MANAGER, ADMIN  
**Response:**
```json
{
  "data": {
    "team": [
      {
        "id": "usr_abc123",
        "name": "Alice Johnson",
        "email": "alice@company.com",
        "role": "EMPLOYEE",
        "department": "Engineering",
        "departmentId": "dept_xyz",
        "managerId": "usr_mgr001",
        "status": "ACTIVE",
        "createdAt": "2025-01-15T09:00:00"
      }
    ]
  }
}
```

---

### `GET /api/v1/employees/{employeeId}/timesheets`
List all timesheets for a specific employee.

**Auth:** MANAGER, ADMIN  
**Response:** Same structure as `GET /api/v1/timesheets`

---

### `GET /api/v1/leaves/team`
View leave requests for the authenticated manager's team.

**Auth:** MANAGER, ADMIN

---

### `PATCH /api/v1/leaves/{leaveId}/approve`
Approve a team member's leave.

**Auth:** MANAGER, ADMIN

---

### `PATCH /api/v1/leaves/{leaveId}/reject`
Reject a team member's leave.

**Auth:** MANAGER, ADMIN

---

### `GET /api/v1/employees`
List all employees (org-wide).

**Auth:** ADMIN only  
**Params:** `departmentId` (optional), `status` (optional)

---

### `POST /api/v1/employees`
Create a new employee.

**Auth:** ADMIN only  
**Body:**
```json
{
  "name": "Bob Chen",
  "email": "bob@company.com",
  "password": "TempPass123!",
  "role": "EMPLOYEE",
  "departmentId": "dept_xyz",
  "managerId": "usr_mgr001"
}
```

---

### `PUT /api/v1/employees/{employeeId}`
Update employee details.

**Auth:** ADMIN only

---

### `PATCH /api/v1/employees/{employeeId}/status`
Activate or deactivate an employee.

**Auth:** ADMIN only  
**Body:**
```json
{ "status": "INACTIVE" }
```

---

## Frontend Components

| Component | File | Description |
|---|---|---|
| `Team` | `pages/Team/Team.jsx` | Team member cards with search and filters |
| `TeamMemberTimesheets` | `pages/Team/TeamMemberTimesheets.jsx` | View a specific member's timesheet list |
| `Employees` | `pages/Employees/Employees.jsx` | Admin full employee management table |
| `employeeSlice` | `features/employees/employeeSlice.js` | Redux: employees list, loading |
| `employeeService` | `services/employeeService.js` | API calls for employees |

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| Manager has no team members | Empty state shown in Team page |
| Employee has no manager assigned | Employee not visible in any manager's team; Admin manages them |
| Admin views team of any manager | Admin can call `GET /employees/{anyManagerId}/team` |
| Deactivated employee tries to log in | `isAccountNonLocked()` returns false → 401 Unauthorized |
| INACTIVE employee's timesheets | Still accessible by Admin for historical reference |

---

## Future Scope

- Team hierarchy visualization (org chart)
- Manager reassignment flow
- Team performance comparisons
- Team leave calendar view
- Bulk employee import via CSV
- Employee self-service profile editing
