# TimeKeeper – Reporting APIs

This document defines the APIs used for reporting, utilization tracking, and organization insights.

Base URL

```
/api/v1
```

Access Control

```
MANAGER → Team reports
ADMIN   → Organization reports
EMPLOYEE → No access
```

Reports are generated using **timesheet and time entry data**.

---

# 1. Team Weekly Utilization

Returns weekly hours logged by each team member.

Used in **Manager Dashboard**.

**Endpoint**

```
GET /api/v1/reports/team-utilization
```

**Access**

```
MANAGER
```

Manager ID is derived from the **JWT token**.

---

**Query Parameters**

```
weekStartDate
```

Example

```
GET /api/v1/reports/team-utilization?weekStartDate=2026-03-09
```

---

**Response**

```json
{
  "weekStartDate": "2026-03-09",
  "team": [
    {
      "employeeId": "usr_101",
      "employeeName": "John Doe",
      "hoursLogged": 38
    },
    {
      "employeeId": "usr_102",
      "employeeName": "Sarah Lee",
      "hoursLogged": 40
    },
    {
      "employeeId": "usr_103",
      "employeeName": "Alex Brown",
      "hoursLogged": 35
    }
  ]
}
```

---

# 2. Employee Weekly Timesheet

Managers or admins can view a specific employee's weekly timesheet summary.

**Endpoint**

```
GET /api/v1/reports/employee-timesheet
```

---

**Query Parameters**

```
employeeId
weekStartDate
```

Example

```
GET /api/v1/reports/employee-timesheet?employeeId=usr_101&weekStartDate=2026-03-09
```

---

**Response**

```json
{
  "employeeId": "usr_101",
  "employeeName": "John Doe",
  "weekStartDate": "2026-03-09",
  "totalHours": 38,
  "dailySummary": [
    {
      "day": "MONDAY",
      "hours": 8
    },
    {
      "day": "TUESDAY",
      "hours": 8
    },
    {
      "day": "WEDNESDAY",
      "hours": 0
    },
    {
      "day": "THURSDAY",
      "hours": 8
    },
    {
      "day": "FRIDAY",
      "hours": 14
    }
  ]
}
```

---

# 3. Project Effort Report

Shows total hours spent on a project.

Used for **client billing and project tracking**.

**Endpoint**

```
GET /api/v1/reports/project-effort
```

---

**Query Parameters**

```
projectId
```

Example

```
GET /api/v1/reports/project-effort?projectId=prj_101
```

---

**Response**

```json
{
  "projectId": "prj_101",
  "projectName": "Project Alpha",
  "totalHoursLogged": 520,
  "contributors": [
    {
      "employeeId": "usr_101",
      "employeeName": "John Doe",
      "hoursLogged": 120
    },
    {
      "employeeId": "usr_102",
      "employeeName": "Sarah Lee",
      "hoursLogged": 180
    },
    {
      "employeeId": "usr_103",
      "employeeName": "Alex Brown",
      "hoursLogged": 220
    }
  ]
}
```

---

# 4. Department Utilization

Shows how many hours a department worked in a given week.

Used by **Admin Dashboard**.

**Endpoint**

```
GET /api/v1/reports/department-utilization
```

---

**Query Parameters**

```
weekStartDate
```

Example

```
GET /api/v1/reports/department-utilization?weekStartDate=2026-03-09
```

---

**Response**

```json
{
  "weekStartDate": "2026-03-09",
  "departments": [
    {
      "departmentId": "dep_01",
      "departmentName": "Engineering",
      "employeeCount": 15,
      "totalHoursLogged": 520
    },
    {
      "departmentId": "dep_02",
      "departmentName": "Design",
      "employeeCount": 6,
      "totalHoursLogged": 180
    },
    {
      "departmentId": "dep_03",
      "departmentName": "Marketing",
      "employeeCount": 5,
      "totalHoursLogged": 140
    }
  ]
}
```

---

# 5. Organization Weekly Summary

Provides high-level metrics across the company.

Used in **Admin Dashboard Overview**.

**Endpoint**

```
GET /api/v1/reports/org-summary
```

---

**Query Parameters**

```
weekStartDate
```

Example

```
GET /api/v1/reports/org-summary?weekStartDate=2026-03-09
```

---

**Response**

```json
{
  "weekStartDate": "2026-03-09",
  "totalEmployees": 26,
  "totalProjects": 8,
  "totalHoursLogged": 840,
  "averageHoursPerEmployee": 32.3
}
```

---

# Reporting APIs Summary

```
GET /api/v1/reports/team-utilization
GET /api/v1/reports/employee-timesheet
GET /api/v1/reports/project-effort
GET /api/v1/reports/department-utilization
GET /api/v1/reports/org-summary
```

---

# Data Sources Used

Reports are generated using these tables

```
employees
departments
projects
timesheets
time_entries
```

---

# Purpose of Reporting APIs

These APIs provide visibility for:

```
Manager → Team performance
Admin → Organization workload
Finance → Client billing
Leadership → Resource utilization
```