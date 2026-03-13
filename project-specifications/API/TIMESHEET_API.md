# TimeKeeper – Timesheet APIs

This document defines the APIs used for weekly timesheet management and time logging.

Base URL

```
/api/v1
```

Access Control

```
EMPLOYEE → Manage own timesheets
MANAGER → View team timesheets
ADMIN → View all timesheets
```

Timesheets are **weekly records** where employees log time spent on projects.

Each timesheet contains **daily time blocks**.

---

# Timesheet Structure

A timesheet represents **one week of work**.

Example

```
Week: 10 Mar – 14 Mar
```

Days included

```
Monday
Tuesday
Wednesday
Thursday
Friday
```

Maximum hours per day

```
8 hours
```

---

# 1. Get Last 5 Timesheets (Dashboard)

Returns the last 5 weekly timesheets for the logged-in employee.

**Endpoint**

```
GET /api/v1/timesheets/my
```

**Access**

```
EMPLOYEE
```

---

**Response**

```json
{
  "timesheets": [
    {
      "id": "ts_101",
      "weekStartDate": "2026-03-09",
      "weekEndDate": "2026-03-13",
      "totalHours": 38,
      "status": "SUBMITTED"
    },
    {
      "id": "ts_102",
      "weekStartDate": "2026-03-02",
      "weekEndDate": "2026-03-06",
      "totalHours": 40,
      "status": "SUBMITTED"
    },
    {
      "id": "ts_103",
      "weekStartDate": "2026-02-23",
      "weekEndDate": "2026-02-27",
      "totalHours": 0,
      "status": "DRAFT"
    }
  ]
}
```

---

# 2. Get Timesheet Details

Returns full details of a timesheet including daily entries.

**Endpoint**

```
GET /api/v1/timesheets/{timesheetId}
```

Example

```
GET /api/v1/timesheets/ts_101
```

---

**Response**

```json
{
  "id": "ts_101",
  "weekStartDate": "2026-03-09",
  "status": "DRAFT",
  "days": [
    {
      "day": "MONDAY",
      "totalHours": 8,
      "entries": [
        {
          "entryId": "te_01",
          "projectId": "prj_101",
          "projectName": "Project Alpha",
          "startTime": "10:00",
          "endTime": "13:00"
        },
        {
          "entryId": "te_02",
          "projectId": "prj_102",
          "projectName": "Project Beta",
          "startTime": "14:00",
          "endTime": "19:00"
        }
      ]
    },
    {
      "day": "TUESDAY",
      "totalHours": 8,
      "entries": [
        {
          "entryId": "te_03",
          "projectId": "prj_101",
          "projectName": "Project Alpha",
          "startTime": "09:00",
          "endTime": "17:00"
        }
      ]
    },
    {
      "day": "WEDNESDAY",
      "status": "LEAVE",
      "totalHours": 0,
      "entries": []
    }
  ]
}
```

---

# 3. Create Timesheet (Auto Weekly)

Creates a timesheet for a given week if it does not exist.

**Endpoint**

```
POST /api/v1/timesheets
```

---

**Request Body**

```json
{
  "weekStartDate": "2026-03-09"
}
```

---

**Response**

```json
{
  "id": "ts_101",
  "weekStartDate": "2026-03-09",
  "status": "DRAFT"
}
```

---

# 4. Add Time Entry

Adds a project time block to a day.

**Endpoint**

```
POST /api/v1/timesheets/{timesheetId}/entries
```

---

**Request Body**

```json
{
  "day": "MONDAY",
  "projectId": "prj_101",
  "startTime": "10:00",
  "endTime": "13:00",
  "description": "Backend development"
}
```

---

**Response**

```json
{
  "entryId": "te_01",
  "day": "MONDAY",
  "projectId": "prj_101",
  "startTime": "10:00",
  "endTime": "13:00",
  "hoursLogged": 3
}
```

---

# 5. Update Time Entry

Updates a time block.

**Endpoint**

```
PUT /api/v1/timesheets/entries/{entryId}
```

---

**Request Body**

```json
{
  "startTime": "11:00",
  "endTime": "14:00"
}
```

---

**Response**

```json
{
  "entryId": "te_01",
  "startTime": "11:00",
  "endTime": "14:00",
  "hoursLogged": 3
}
```

---

# 6. Delete Time Entry

Removes a time block.

**Endpoint**

```
DELETE /api/v1/timesheets/entries/{entryId}
```

---

**Response**

```json
{
  "message": "Time entry deleted"
}
```

---

# 7. Mark Leave for a Day

Marks a day as leave.

**Endpoint**

```
PATCH /api/v1/timesheets/{timesheetId}/leave
```

---

**Request Body**

```json
{
  "day": "WEDNESDAY",
  "leaveType": "LEAVE"
}
```

Leave types

```
LEAVE
SICK_LEAVE
HOLIDAY
```

---

**Response**

```json
{
  "day": "WEDNESDAY",
  "status": "LEAVE",
  "totalHours": 0
}
```

---

# 8. Submit Timesheet

Locks the timesheet after completion.

**Endpoint**

```
PATCH /api/v1/timesheets/{timesheetId}/submit
```

---

**Response**

```json
{
  "id": "ts_101",
  "status": "SUBMITTED"
}
```

Behavior

```
Submitted timesheets become read-only
No further edits allowed
```

---

# System Validation Rules

The system enforces the following:

```
Maximum 8 hours per day
Time blocks cannot overlap
Start time must be before end time
Leave days cannot contain entries
```

Example invalid case

```
Project A 10–2
Project B 1–4
```

This overlaps and should be rejected.

---

# Timesheet Table

```
timesheets
-----------
id
employee_id
week_start_date
week_end_date
status
created_at
```

---

# Time Entry Table

```
time_entries
--------------
id
timesheet_id
project_id
day
start_time
end_time
hours_logged
description
```

---

# Timesheet Status Values

```
DRAFT
SUBMITTED
```

---

# Timesheet APIs Summary

```
GET    /api/v1/timesheets/my
GET    /api/v1/timesheets/{id}
POST   /api/v1/timesheets
POST   /api/v1/timesheets/{id}/entries
PUT    /api/v1/timesheets/entries/{entryId}
DELETE /api/v1/timesheets/entries/{entryId}
PATCH  /api/v1/timesheets/{id}/leave
PATCH  /api/v1/timesheets/{id}/submit
```