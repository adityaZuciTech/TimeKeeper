# TimeKeeper — Timesheets Module

---

## Overview

The Timesheets module is the core of TimeKeeper. Every employee has one timesheet per calendar week (Monday–Friday). They log time blocks (project + start/end time) per day. Once complete, the timesheet is submitted and becomes read-only.

---

## Key Concepts

| Concept | Description |
|---|---|
| **Week** | Monday to Friday (weekends excluded) |
| **Timesheet** | One record per employee per week |
| **Time Entry** | A single time block: project + day + start time + end time |
| **Day Status** | `WORK` (has entries), `LEAVE` (approved leave), `HOLIDAY` (system holiday) |
| **Timesheet Status** | `DRAFT` (editable) or `SUBMITTED` (read-only) |

---

## User Flows

### Employee: Log Time for the Week

```
1. Navigate to "My Timesheets"
2. Select a week (current or past weeks shown)
3. Click "Open" on the week card → navigates to /timesheets/:id
4. For each working day:
   a. Click "+ Add Entry"
   b. Select project from dropdown
   c. Set start time and end time
   d. Optionally add description
   e. Click Save
5. Review total hours per day
6. Click "Submit Timesheet" when ready
7. Confirm submission → timesheet becomes SUBMITTED (locked)
```

### Manager/Admin: View Team Member Timesheet

```
1. Navigate to "Team" page
2. Click on a team member
3. View their timesheet list
4. Click into any timesheet week to see detailed time entries
```

---

## Rules & Validations

| Rule | Enforcement |
|---|-----------|
| One timesheet per employee per week | DB unique constraint on `(employee_id, week_start_date)` |
| Start time must be before end time | Backend validation in service layer |
| No overlapping time entries on the same day | Backend checks existing entries for the same day |
| Holiday days are non-editable | Day response has `editable: false` when matched to Holiday |
| APPROVED leave days are non-editable | Day response has `editable: false`, `dayStatus: LEAVE` |
| SUBMITTED timesheets are fully read-only | `editable: false` on all days when status = SUBMITTED |
| ACTIVE projects only — COMPLETED and ON_HOLD blocked | Project status check before entry creation |
| Entries only Mon–Fri | `DayOfWeek` enum: MONDAY–FRIDAY |

---

## Data Model

### `timesheets` Table

| Column | Type | Notes |
|---|---|---|
| `id` | VARCHAR(50) | Format: `ts_` + 8-char UUID segment |
| `employee_id` | VARCHAR(50) | FK → employees.id |
| `week_start_date` | DATE | Always a Monday |
| `week_end_date` | DATE | Always a Friday |
| `status` | VARCHAR(20) | `DRAFT` or `SUBMITTED` |
| `created_at` | TIMESTAMP | Auto-set on insert |

### `time_entries` Table

| Column | Type | Notes |
|---|---|---|
| `id` | VARCHAR(50) | Format: `te_` + 8-char UUID segment |
| `timesheet_id` | VARCHAR(50) | FK → timesheets.id |
| `project_id` | VARCHAR(50) | FK → projects.id (NULL for LEAVE/HOLIDAY) |
| `day_of_week` | VARCHAR(20) | `MONDAY`…`FRIDAY` |
| `entry_type` | VARCHAR(20) | `WORK`, `LEAVE`, `HOLIDAY` |
| `start_time` | TIME | NULL for LEAVE/HOLIDAY |
| `end_time` | TIME | NULL for LEAVE/HOLIDAY |
| `hours_logged` | DECIMAL(4,2) | Computed from start/end |
| `description` | TEXT | Optional notes |

---

## API Endpoints

### `GET /api/v1/timesheets`
Returns authenticated user's timesheets.

**Params:** `weekStartDate` (ISO date, optional)  
**Auth:** All roles

**Response:**
```json
{
  "data": {
    "timesheets": [
      {
        "id": "ts_abc12345",
        "employeeId": "usr_xyz789",
        "employeeName": "Jane Smith",
        "weekStartDate": "2026-03-16",
        "weekEndDate": "2026-03-20",
        "totalHours": 38.5,
        "status": "DRAFT",
        "days": [...]
      }
    ]
  }
}
```

---

### `POST /api/v1/timesheets`
Create a new timesheet for the current week.

**Auth:** All roles  
**Body:**
```json
{ "weekStartDate": "2026-03-16" }
```

---

### `GET /api/v1/timesheets/{timesheetId}`
Get full detail for a single timesheet including all days and entries.

**Auth:** All roles (ownership enforced in service)

**Day Response Object:**
```json
{
  "day": "MONDAY",
  "totalHours": 8.0,
  "dayStatus": "WORK",
  "leaveType": null,
  "leaveId": null,
  "editable": true,
  "entries": [
    {
      "id": "te_abc123",
      "projectId": "prj_xyz",
      "projectName": "Website Redesign",
      "startTime": "09:00",
      "endTime": "17:00",
      "hoursLogged": 8.0,
      "description": "Frontend development"
    }
  ]
}
```

---

### `POST /api/v1/timesheets/{timesheetId}/submit`
Submit (lock) a timesheet.

**Auth:** All roles  
**Response:** Updated timesheet with `status: "SUBMITTED"`

---

### `POST /api/v1/timesheets/{timesheetId}/entries`
Add a time entry.

**Auth:** All roles  
**Body:**
```json
{
  "projectId": "prj_xyz",
  "day": "TUESDAY",
  "startTime": "09:00",
  "endTime": "13:00",
  "description": "API development"
}
```

---

### `PUT /api/v1/timesheets/{timesheetId}/entries/{entryId}`
Update an existing time entry.

**Auth:** All roles

---

### `DELETE /api/v1/timesheets/{timesheetId}/entries/{entryId}`
Delete a time entry.

**Auth:** All roles

---

### `POST /api/v1/timesheets/{timesheetId}/copy-last-week`
Copy WORK entries from the immediately preceding week (MERGE strategy).

**Auth:** Employee (own DRAFT or REJECTED timesheets only)

**Behaviour:** Non-destructive — never removes or modifies existing target entries. Only new, non-conflicting entries are added. Returns the updated timesheet and a copy summary.

**Skip rules (evaluated in order for each source entry):**
| Reason Code | Condition |
|---|---|
| `FUTURE_DAY` | Target calendar day has not yet occurred |
| `HOLIDAY_DAY` | Target day is a company holiday |
| `LEAVE_DAY` | Employee has approved leave on that day |
| `PROJECT_NOT_ACTIVE` | Source project is COMPLETED, ON_HOLD, or deleted |
| `DUPLICATE_ENTRY` | Same project + start time + end time already exists in target |
| `OVERLAP_STRICT` | Entry overlaps (including boundary-touch) an existing target entry |

**Response:**
```json
{
  "data": {
    "timesheet": { ... },
    "copySummary": {
      "copiedCount": 3,
      "skippedCount": 1,
      "message": null,
      "skippedEntries": [
        {
          "day": "MONDAY",
          "projectId": "prj_xyz",
          "projectName": "Old Project",
          "startTime": "09:00",
          "endTime": "17:00",
          "reason": "PROJECT_NOT_ACTIVE",
          "conflictingRange": null
        }
      ]
    }
  }
}
```

**Note:** `conflictingRange` is populated only for `OVERLAP_STRICT` entries (format: `"HH:mm–HH:mm"`).

---

### `GET /api/v1/employees/{employeeId}/timesheets`
View timesheets for a specific employee.

**Auth:** MANAGER, ADMIN

---

## Frontend Components

| Component | File | Description |
|---|---|---|
| `Timesheets` | `pages/Timesheets/Timesheets.jsx` | Featured current week card + past weeks grid |
| `TimesheetDetail` | `pages/Timesheets/TimesheetDetail.jsx` | Full day-by-day editor with entry management |
| `timesheetSlice` | `features/timesheets/timesheetSlice.js` | Redux state: current timesheet, list, loading, copyLoading |
| `timesheetService` | `services/timesheetService.js` | API calls |

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| Trying to add entry to SUBMITTED timesheet | Backend returns 400, UI shows field as read-only |
| Leave approved after timesheet created | Day becomes non-editable on next load |
| Holiday falls on existing work entry | Entry shows as HOLIDAY, existing WORK entries still stored |
| Employee tries to open another employee's timesheet | Service validates ownership (returns 403 if not manager/admin) |
| Creating timesheet for existing week | Returns existing timesheet (idempotent) |
| Logging time to an ON_HOLD or COMPLETED project | Backend throws 400: "Cannot log time to an inactive project" |
| Copying last week when no prior timesheet exists | Returns copiedCount=0, message: "No previous week timesheet found" |
| Copying same week twice | Second run returns copiedCount=0 (all entries are DUPLICATE_ENTRY) |
| Copying mid-week (Thu/Fri not yet reached) | Future days skipped as FUTURE_DAY, past days processed normally |
| Manager viewing an employee's DRAFT timesheet | Copy Last Week button hidden (ownership guard: own timesheets only) |

---

## Future Scope

- Timesheet comments/notes
- Max daily hours cap configurable per organization
- Weekend timesheet support (for on-call teams)
- Time entry tags/categories beyond project
