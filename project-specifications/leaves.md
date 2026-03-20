# TimeKeeper — Leave Management Module

---

## Overview

The Leave Management module allows employees to apply for time off, tracks leave balances by type, and routes requests through a manager/admin approval workflow. Approved leaves automatically mark the corresponding days as non-editable in the employee's timesheet.

---

## Leave Types

| Type | Display Name | Annual Balance (Client-side) |
|---|---|---|
| `SICK` | Sick Leave | 10 days |
| `CASUAL` | Casual Leave | 12 days |
| `VACATION` | Vacation | 15 days |

> **Note:** Leave balances are calculated client-side based on approved leaves in the current calendar year. There is no separate balance table in the backend.

---

## Leave Statuses

| Status | Description |
|---|---|
| `PENDING` | Submitted, awaiting manager/admin decision |
| `APPROVED` | Approved by manager/admin |
| `REJECTED` | Rejected with optional reason |

---

## User Flows

### Employee: Apply for Leave

```
1. Navigate to "My Leaves"
2. Click "Apply Leave"
3. Select leave type (SICK / CASUAL / VACATION)
4. Pick start date and end date
5. Enter reason (optional)
6. Submit → Leave created with status PENDING
7. Manager receives the request in their "Team Leaves" view
```

### Manager/Admin: Review Leave Request

```
1. Navigate to "Team Leaves" (Manager) or leave section
2. See list of PENDING, APPROVED, REJECTED leaves for team
3. Click Approve → provides optional note → status = APPROVED
   OR
   Click Reject → provides optional rejection reason → status = REJECTED
4. Employee's timesheet days for the leave period become non-editable
```

### Employee: View Leave Balance

```
1. Navigate to "My Leaves"
2. Balance cards shown at top:
   - Sick Leave: X / 10 used
   - Casual Leave: X / 12 used
   - Vacation: X / 15 used
3. Remaining days calculated from APPROVED leaves in current year
```

---

## Rules & Validations

| Rule | Enforcement |
|---|---|
| Cannot apply leave on a date that is already a holiday | Backend checks HolidayRepository |
| `startDate` must be ≤ `endDate` | Backend validation |
| Leave days calculated inclusive (startDate to endDate) | `ChronoUnit.DAYS.between() + 1` |
| All roles can apply for leave | `@PreAuthorize("hasAnyRole('EMPLOYEE', 'MANAGER', 'ADMIN')")` |
| Only MANAGER / ADMIN can approve or reject | `@PreAuthorize("hasAnyRole('MANAGER', 'ADMIN')")` |
| Managers can only approve/reject their team's leaves | Service-layer ownership check |
| APPROVED leaves make timesheet days non-editable | Checked in timesheetService when building day responses |

---

## Data Model

### `leaves` Table

| Column | Type | Notes |
|---|---|---|
| `id` | VARCHAR(50) | Format: `lv_` + 8-char UUID segment |
| `employee_id` | VARCHAR(50) | FK → employees.id |
| `start_date` | DATE | Inclusive |
| `end_date` | DATE | Inclusive |
| `leave_type` | VARCHAR(20) | `SICK`, `CASUAL`, `VACATION` |
| `status` | VARCHAR(20) | `PENDING`, `APPROVED`, `REJECTED` |
| `reason` | TEXT | Employee-provided reason (optional) |
| `approved_by` | VARCHAR(50) | FK → employees.id (nullable) |
| `rejection_reason` | TEXT | Manager-provided rejection note (nullable) |
| `created_at` | TIMESTAMP | Auto-set on insert |

---

## API Endpoints

### `POST /api/v1/leaves`
Apply for leave.

**Auth:** All roles  
**Body:**
```json
{
  "startDate": "2026-03-25",
  "endDate": "2026-03-27",
  "leaveType": "CASUAL",
  "reason": "Family event"
}
```

**Response:**
```json
{
  "data": {
    "id": "lv_abc12345",
    "employeeId": "usr_xyz789",
    "employeeName": "Jane Smith",
    "employeeDepartment": "Engineering",
    "startDate": "2026-03-25",
    "endDate": "2026-03-27",
    "totalDays": 3,
    "leaveType": "CASUAL",
    "status": "PENDING",
    "reason": "Family event",
    "approvedBy": null,
    "approvedByName": null,
    "rejectionReason": null,
    "createdAt": "2026-03-20T11:00:00"
  }
}
```

---

### `GET /api/v1/leaves/my`
Get authenticated user's leave history.

**Auth:** All roles  
**Response:** `{ "data": { "leaves": [...] } }`

---

### `GET /api/v1/leaves/team`
Get all leave requests for the authenticated manager's team.

**Auth:** MANAGER, ADMIN  
**Response:** `{ "data": { "leaves": [...] } }`

---

### `PATCH /api/v1/leaves/{leaveId}/approve`
Approve a leave request.

**Auth:** MANAGER, ADMIN  
**Body (optional):**
```json
{ "note": "Approved. Enjoy your time off." }
```

---

### `PATCH /api/v1/leaves/{leaveId}/reject`
Reject a leave request.

**Auth:** MANAGER, ADMIN  
**Body (optional):**
```json
{ "note": "Team deadline conflict. Please reschedule." }
```

---

## Frontend Components

| Component | File | Description |
|---|---|---|
| `MyLeaves` | `pages/Leaves/MyLeaves.jsx` | Balance cards, apply drawer, leave history |
| `leaveSlice` | `features/leaves/leaveSlice.js` | Redux: myLeaves, teamLeaves, loading |
| `leaveService` | `services/leaveService.js` | applyLeave, getMyLeaves, getTeamLeaves, approve, reject |

### Balance Configuration (Frontend)
```js
const BALANCE_CONFIG = {
  SICK:     { label: 'Sick Leave',    total: 10, color: 'rose' },
  CASUAL:   { label: 'Casual Leave',  total: 12, color: 'amber' },
  VACATION: { label: 'Vacation',      total: 15, color: 'emerald' },
}
```

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| Apply leave covering a holiday date | Backend rejects with "date conflicts with a holiday" |
| Manager approves own leave | Allowed (no self-approval restriction in current build) |
| Leave already approved — try to reject | Creates an inconsistent state; not currently blocked |
| Leave spans weekend days (Sat/Sun) | `totalDays` counts calendar days, not working days |
| Employee has no manager assigned | Admin handles their team leaves |

---

## Future Scope

- Leave cancellation by employee
- Working-days-only `totalDays` calculation (exclude weekends/holidays)
- Leave approval by Admin even when manager not assigned
- Custom leave balance configuration per department or role
- Leave balance carryover between years
- Leave conflict detection (multiple team members off same dates)
- Calendar view of team leaves
