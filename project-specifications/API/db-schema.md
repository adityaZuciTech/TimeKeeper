# TimeKeeper – Database Schema

---

# Entity Relationship (ER)

```
Department
   │
   ├── Employees
   │
   └── Projects

Employee
   │
   └── Timesheets

Timesheet
   │
   └── TimeEntries

Project
   │
   └── TimeEntries
```

Relationship Summary

```
Department 1 ──── N Employees
Department 1 ──── N Projects

Employee 1 ──── N Timesheets

Timesheet 1 ──── N TimeEntries

Project 1 ──── N TimeEntries
```

---

# Tables

```
departments
employees
projects
timesheets
time_entries
```

---

# Departments Table

| Column | Type |
|------|------|
| id | VARCHAR(50) |
| name | VARCHAR(100) |
| description | TEXT |
| status | VARCHAR(20) |
| created_at | TIMESTAMP |

---

# Employees Table

| Column | Type |
|------|------|
| id | VARCHAR(50) |
| name | VARCHAR(100) |
| email | VARCHAR(150) |
| password | VARCHAR(255) |
| role | VARCHAR(20) |
| department_id | VARCHAR(50) |
| manager_id | VARCHAR(50) |
| status | VARCHAR(20) |
| created_at | TIMESTAMP |

---

# Projects Table

| Column | Type |
|------|------|
| id | VARCHAR(50) |
| name | VARCHAR(150) |
| client_name | VARCHAR(150) |
| department_id | VARCHAR(50) |
| start_date | DATE |
| end_date | DATE |
| status | VARCHAR(20) |
| created_at | TIMESTAMP |

---

# Timesheets Table

| Column | Type |
|------|------|
| id | VARCHAR(50) |
| employee_id | VARCHAR(50) |
| week_start_date | DATE |
| week_end_date | DATE |
| status | VARCHAR(20) |
| created_at | TIMESTAMP |

---

# Time Entries Table

| Column | Type |
|------|------|
| id | VARCHAR(50) |
| timesheet_id | VARCHAR(50) |
| project_id | VARCHAR(50) |
| day | VARCHAR(20) |
| entry_type | VARCHAR(20) |
| start_time | TIME |
| end_time | TIME |
| hours_logged | DECIMAL(4,2) |
| description | TEXT |

---

# Entry Type Values

```
WORK
LEAVE
HOLIDAY
```

Rules

```
WORK → normal time entry

LEAVE → hours_logged = 0
        start_time = NULL
        end_time = NULL
        project_id = NULL

HOLIDAY → hours_logged = 0
          start_time = NULL
          end_time = NULL
          project_id = NULL
```

---

# Status Values

Employee Status

```
ACTIVE
INACTIVE
```

Department Status

```
ACTIVE
INACTIVE
```

Project Status

```
ACTIVE
ON_HOLD
COMPLETED
```

Timesheet Status

```
DRAFT
SUBMITTED
```

Days

```
MONDAY
TUESDAY
WEDNESDAY
THURSDAY
FRIDAY
```