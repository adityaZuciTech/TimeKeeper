# TimeKeeper — API Specification

**Base URL:** `http://localhost:8080/api/v1`  
**Auth:** All endpoints (except `POST /auth/login`) require `Authorization: Bearer <JWT>` header.

---

## Response Envelope

All endpoints return a consistent JSON wrapper:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "timestamp": "2026-03-16T14:30:00Z"
}
```

Error response (same structure, `success: false`):
```json
{
  "success": false,
  "message": "Resource not found",
  "data": null,
  "timestamp": "2026-03-16T14:30:00Z"
}
```

**Exception → HTTP Status mapping:**

| Exception | Status |
|---|---|
| `ResourceNotFoundException` | 404 Not Found |
| `BusinessException` | 400 Bad Request |
| `BadCredentialsException` | 401 Unauthorized |
| `AccessDeniedException` | 403 Forbidden |
| `MethodArgumentNotValidException` | 400 Bad Request (field errors in `data`) |
| General `Exception` | 500 Internal Server Error |

---

## Auth (`/auth`)

### `POST /auth/login`
**Auth:** Public

**Request:**
```json
{ "email": "alice@example.com", "password": "secret123" }
```

**Response `200`:**
```json
{
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "userId": "usr_abc123",
    "name": "Alice Johnson",
    "role": "EMPLOYEE",
    "email": "alice@example.com"
  }
}
```

---

### `POST /auth/logout`
**Auth:** Any authenticated user  
**Body:** None  
**Response `200`:** `{ "message": "Logged out successfully", "data": null }`  
**Note:** Stateless — client discards JWT; no server-side token invalidation.

---

### `POST /auth/change-password`
**Auth:** Any authenticated user

**Request:**
```json
{ "currentPassword": "old123", "newPassword": "new456" }
```

**Response `200`:** `{ "message": "Password changed successfully", "data": null }`

---

## Employees (`/employees`)

### `POST /employees`
**Auth:** ADMIN  
**Request:**
```json
{
  "firstName": "Alice",
  "lastName": "Johnson",
  "email": "alice@example.com",
  "password": "temp1234",
  "role": "EMPLOYEE",
  "departmentId": "dept_abc",
  "managerId": "usr_mgr1",
  "position": "Software Engineer",
  "phone": "+1-555-0100",
  "startDate": "2026-01-15"
}
```
**Response `201`:** `EmployeeResponse`

---

### `GET /employees`
**Auth:** ADMIN  
**Params:** `departmentId` (optional), `status` (optional: `ACTIVE`/`INACTIVE`)  
**Response `200`:**
```json
{ "data": { "employees": [ ...EmployeeResponse ] } }
```

---

### `GET /employees/{employeeId}`
**Auth:** ADMIN (any), MANAGER (any), EMPLOYEE (own ID only)  
**Response `200`:** `{ "data": EmployeeResponse }`  
**Note:** Employees can only fetch their own profile; attempting to fetch another employee's data returns `403`.

---

### `PUT /employees/{employeeId}`
**Auth:** ADMIN  
**Request:** `UpdateEmployeeRequest` (same fields as create, all optional)  
**Response `200`:** `{ "data": EmployeeResponse }`

---

### `PATCH /employees/{employeeId}/status`
**Auth:** ADMIN  
**Request:** `{ "status": "INACTIVE" }`  
**Response `200`:** `{ "data": EmployeeResponse }`

---

### `GET /employees/{managerId}/team`
**Auth:** ADMIN, MANAGER  
**Response `200`:**
```json
{ "data": { "team": [ ...EmployeeResponse ] } }
```

---

### `GET /employees/{employeeId}/timesheets`
**Auth:** ADMIN, MANAGER  
**Response `200`:**
```json
{ "data": { "timesheets": [ ...TimesheetResponse ] } }
```

---

**`EmployeeResponse` shape:**
```json
{
  "id": "usr_abc123",
  "firstName": "Alice",
  "lastName": "Johnson",
  "email": "alice@example.com",
  "role": "EMPLOYEE",
  "status": "ACTIVE",
  "position": "Software Engineer",
  "phone": "+1-555-0100",
  "departmentId": "dept_abc",
  "departmentName": "Engineering",
  "managerId": "usr_mgr1",
  "managerName": "Bob Manager",
  "startDate": "2026-01-15"
}
```

---

## Departments (`/departments`)

### `POST /departments`
**Auth:** ADMIN  
**Request:** `{ "name": "Engineering", "description": "..." }`  
**Response `201`:** `DepartmentResponse`

---

### `GET /departments`
**Auth:** EMPLOYEE, MANAGER, ADMIN  
**Response `200`:**
```json
{ "data": { "departments": [ ...DepartmentResponse ] } }
```

---

### `GET /departments/{departmentId}`
**Auth:** ADMIN, MANAGER  
**Response `200`:** `{ "data": DepartmentResponse }`

---

### `PUT /departments/{departmentId}`
**Auth:** ADMIN  
**Request:** `CreateDepartmentRequest`  
**Response `200`:** `{ "data": DepartmentResponse }`

---

### `PATCH /departments/{departmentId}/status`
**Auth:** ADMIN  
**Request:** `{ "status": "INACTIVE" }`  
**Response `200`:** `{ "data": DepartmentResponse }`

---

### `GET /departments/{departmentId}/employees`
**Auth:** ADMIN, MANAGER  
**Response `200`:**
```json
{ "data": { "departmentId": "dept_abc", "employees": [ ...EmployeeResponse ] } }
```

---

## Projects (`/projects`)

### `POST /projects`
**Auth:** ADMIN  
**Request:**
```json
{
  "name": "Website Redesign",
  "description": "...",
  "departmentId": "dept_abc",
  "startDate": "2026-01-01",
  "endDate": "2026-06-30"
}
```
**Response `201`:** `ProjectResponse`

---

### `GET /projects`
**Auth:** EMPLOYEE, MANAGER, ADMIN  
**Params:** `departmentId` (optional), `status` (optional: `ACTIVE`/`ON_HOLD`/`COMPLETED`)  
**Response `200`:**
```json
{ "data": { "projects": [ ...ProjectResponse ] } }
```

---

### `GET /projects/{projectId}`
**Auth:** EMPLOYEE, MANAGER, ADMIN  
**Response `200`:** `{ "data": ProjectResponse }`

---

### `PUT /projects/{projectId}`
**Auth:** ADMIN  
**Request:** `UpdateProjectRequest`  
**Response `200`:** `{ "data": ProjectResponse }`

---

### `PATCH /projects/{projectId}/status`
**Auth:** ADMIN  
**Request:** `{ "status": "COMPLETED" }`  
**Response `200`:** `{ "data": ProjectResponse }`

---

**`ProjectResponse` shape:**
```json
{
  "id": "prj_xyz",
  "name": "Website Redesign",
  "description": "...",
  "status": "ACTIVE",
  "departmentId": "dept_abc",
  "departmentName": "Engineering",
  "startDate": "2026-01-01",
  "endDate": "2026-06-30"
}
```

---

## Timesheets (`/timesheets`)

### `GET /timesheets/my`
**Auth:** EMPLOYEE, MANAGER, ADMIN  
Returns last 5 timesheets for the authenticated user.  
**Response `200`:**
```json
{ "data": { "timesheets": [ ...TimesheetResponse ] } }
```

---

### `POST /timesheets`
**Auth:** EMPLOYEE, MANAGER, ADMIN  
**Request:** `{ "weekStartDate": "2026-03-16" }`  
**Response `201`:** `{ "data": TimesheetResponse }`  
**Note:** Idempotent — returns existing timesheet if one already exists for the week.

---

### `GET /timesheets`
**Auth:** EMPLOYEE, MANAGER, ADMIN  
**Params:** `weekStartDate` (ISO date, required)  
**Response `200`:** `{ "data": TimesheetResponse }`

---

### `GET /timesheets/{timesheetId}`
**Auth:** EMPLOYEE, MANAGER, ADMIN  
**Response `200`:** `{ "data": TimesheetResponse }`

---

### `POST /timesheets/{timesheetId}/submit`
**Auth:** EMPLOYEE, MANAGER, ADMIN  
**Body:** None  
**Response `200`:** `{ "data": TimesheetResponse }` (status changes to SUBMITTED)

---

### `POST /timesheets/{timesheetId}/entries`
**Auth:** EMPLOYEE, MANAGER, ADMIN  
**Request:**
```json
{
  "date": "2026-03-17",
  "dayOfWeek": "MON",
  "projectId": "prj_xyz",
  "hours": 8.0,
  "entryType": "WORK",
  "notes": "Feature development"
}
```
**Response `201`:** `{ "data": TimeEntryResponse }`

---

### `GET /timesheets/{timesheetId}/entries`
**Auth:** EMPLOYEE, MANAGER, ADMIN  
**Response `200`:** `{ "data": [ ...TimeEntryResponse ] }`

---

### `PUT /timesheets/entries/{entryId}`
**Auth:** EMPLOYEE, MANAGER, ADMIN  
**Request:** `UpdateTimeEntryRequest` (hours, notes, projectId — all optional)  
**Response `200`:** `{ "data": TimeEntryResponse }`

---

### `DELETE /timesheets/entries/{entryId}`
**Auth:** EMPLOYEE, MANAGER, ADMIN  
**Response `200`:** `{ "message": "Entry deleted", "data": null }`

---

**`TimesheetResponse` shape:**
```json
{
  "id": "ts_abc",
  "employeeId": "usr_abc123",
  "employeeName": "Alice Johnson",
  "weekStartDate": "2026-03-16",
  "weekEndDate": "2026-03-22",
  "status": "DRAFT",
  "totalHours": 32.5,
  "entries": [ ...TimeEntryResponse ]
}
```

**`TimeEntryResponse` shape:**
```json
{
  "id": "te_xyz",
  "date": "2026-03-17",
  "dayOfWeek": "MON",
  "projectId": "prj_xyz",
  "projectName": "Website Redesign",
  "hours": 8.0,
  "entryType": "WORK",
  "notes": "Feature development"
}
```

---

## Leaves (`/leaves`)

### `POST /leaves`
**Auth:** EMPLOYEE, MANAGER, ADMIN  
**Request:**
```json
{
  "leaveType": "VACATION",
  "startDate": "2026-04-01",
  "endDate": "2026-04-05",
  "reason": "Family vacation"
}
```
**Response `201`:** `{ "data": LeaveResponse }`

---

### `GET /leaves/my`
**Auth:** EMPLOYEE, MANAGER, ADMIN  
Returns all leave requests for the authenticated user.  
**Response `200`:**
```json
{ "data": { "leaves": [ ...LeaveResponse ] } }
```

---

### `GET /leaves/team`
**Auth:** MANAGER, ADMIN  
Returns all leave requests from the manager's direct reports.  
**Response `200`:**
```json
{ "data": { "leaves": [ ...LeaveResponse ] } }
```

---

### `PATCH /leaves/{leaveId}/approve`
**Auth:** MANAGER, ADMIN  
**Request (optional):** `{ "comment": "Approved" }`  
**Response `200`:** `{ "data": LeaveResponse }` (status → APPROVED)

---

### `PATCH /leaves/{leaveId}/reject`
**Auth:** MANAGER, ADMIN  
**Request (optional):** `{ "comment": "Insufficient coverage" }`  
**Response `200`:** `{ "data": LeaveResponse }` (status → REJECTED)

---

**`LeaveResponse` shape:**
```json
{
  "id": "lv_xyz",
  "employeeId": "usr_abc123",
  "employeeName": "Alice Johnson",
  "leaveType": "VACATION",
  "startDate": "2026-04-01",
  "endDate": "2026-04-05",
  "status": "PENDING",
  "reason": "Family vacation",
  "comment": null,
  "reviewedById": null,
  "reviewedByName": null
}
```

---

## Holidays (`/holidays`)

### `GET /holidays`
**Auth:** EMPLOYEE, MANAGER, ADMIN  
**Response `200`:**
```json
{ "data": { "holidays": [ ...HolidayResponse ] } }
```

---

### `POST /holidays`
**Auth:** ADMIN  
**Request:**
```json
{
  "name": "Independence Day",
  "date": "2026-07-04",
  "description": "National holiday"
}
```
**Response `201`:** `{ "data": HolidayResponse }`

---

### `DELETE /holidays/{id}`
**Auth:** ADMIN  
**Response `200`:** `{ "message": "Holiday deleted", "data": null }`

---

**`HolidayResponse` shape:**
```json
{
  "id": "hol_abc",
  "name": "Independence Day",
  "date": "2026-07-04",
  "description": "National holiday",
  "dayOfWeek": "SATURDAY"
}
```

---

## Reports (`/reports`)

### `GET /reports/team-utilization`
**Auth:** MANAGER, ADMIN  
**Params:** `weekStartDate` (ISO date)  
**Response `200`:** `{ "data": TeamUtilizationReport }`

---

### `GET /reports/employee-timesheet`
**Auth:** MANAGER, ADMIN  
**Params:** `employeeId`, `weekStartDate`  
**Response `200`:** `{ "data": TimesheetResponse }`

---

### `GET /reports/project-effort`
**Auth:** MANAGER, ADMIN  
**Params:** `projectId`  
**Response `200`:** `{ "data": ProjectEffortReport }`

---

### `GET /reports/department-utilization`
**Auth:** ADMIN  
**Params:** `weekStartDate` (optional — defaults to current Monday)  
**Response `200`:**
```json
{
  "data": [
    {
      "departmentId": "dept_abc",
      "departmentName": "Engineering",
      "employeeCount": 8,
      "totalHours": 280.0
    }
  ]
}
```

---

### `POST /reports/export-pdf`
**Auth:** ADMIN  
**Content-Type:** `application/json`  
**Response `200`:** `application/pdf` blob  
**Content-Disposition:** `attachment; filename="timekeeper-report.pdf"`  
**Body:** `PdfReportRequest` (see [export-and-reporting.md](export-and-reporting.md))

---

## Admin Reminders (`/admin/reminders`)

### `POST /admin/reminders/timesheets`
**Auth:** ADMIN  
**Body:** None  
**Response `200`:**
```json
{ "message": "Weekly timesheet reminders triggered successfully" }
```
