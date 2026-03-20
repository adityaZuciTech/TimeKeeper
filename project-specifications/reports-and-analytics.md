# TimeKeeper — Reports & Analytics Module

---

## Overview

The Reports & Analytics module provides workforce visibility at three levels: individual employee timesheets, team utilization, and organization-wide department analytics. Admins additionally have access to PDF and CSV export of the full organization report.

---

## Report Types

| Report | Audience | Scope |
|---|---|---|
| Team Utilization | MANAGER, ADMIN | Hours and entries for all team members for a given week |
| Employee Timesheet | MANAGER, ADMIN | Full timesheet detail for a specific employee + week |
| Project Effort | MANAGER, ADMIN | Total hours logged across all employees for a given project |
| Department Utilization | ADMIN | Hours, employee count, and utilization % per department |
| Organization Dashboard | ADMIN | Live interactive charts + 6-week trend + insights |

---

## Organization Dashboard (Admin)

The centerpiece analytics experience for Admins.

### Stat Cards
| Card | Data Source |
|---|---|
| Departments | Count of departments with hours > 0 for selected week |
| Total Employees | Sum of `employeeCount` across departments |
| Hours This Week | Sum of `totalHours` across all departments |
| Avg Utilization | Mean utilization % across departments |

Utilization formula:
```
utilization% = (totalHours / (employeeCount × 40)) × 100
```

### Week Selector
4 options: This Week, Last Week, 2 Weeks Ago, 3 Weeks Ago.  
Drives the department data fetch (`weekStartDate` param).

### Weekly Hours Trend (Area Chart)
- Fetches data for last 6 weeks in parallel on page mount
- X-axis: week start dates (e.g. "Mar 2", "Mar 9"…)
- Y-axis: total hours logged org-wide
- Shows ↑/↓ % change vs previous week on the Hours stat card

### Department Distribution (Donut Chart)
- Each slice = one department's proportion of total hours
- Legend shows name, hours, and percentage
- Tooltip shows department name and absolute hours

### Department Utilization Table
Sortable columns: Department Name, Employees, Total Hours, Avg/Employee, Utilization %.  
Utilization progress bar + badge (High ≥80%, Moderate 50–79%, Low <50%).

### Key Insights Panel
Auto-generated text insights:
- Top performing department (highest utilization)
- Low utilization alert (if any dept < 50%)
- Departments with zero hours logged
- Organization-wide utilization summary
- Total employees tracked

---

## API Endpoints

### `GET /api/v1/reports/team-utilization`
**Auth:** MANAGER, ADMIN  
**Params:** `weekStartDate` (ISO date)

**Response:**
```json
{
  "data": {
    "weekStartDate": "2026-03-16",
    "teamMembers": [
      {
        "employeeId": "usr_abc123",
        "employeeName": "Alice Johnson",
        "totalHours": 36.5,
        "entries": [...]
      }
    ]
  }
}
```

---

### `GET /api/v1/reports/employee-timesheet`
**Auth:** MANAGER, ADMIN  
**Params:** `employeeId`, `weekStartDate`

Returns full timesheet detail for a specific employee + week (same structure as `GET /timesheets/{id}`).

---

### `GET /api/v1/reports/project-effort`
**Auth:** MANAGER, ADMIN  
**Params:** `projectId`

**Response:**
```json
{
  "data": {
    "projectId": "prj_xyz",
    "projectName": "Website Redesign",
    "totalHours": 284.5,
    "contributors": [
      {
        "employeeId": "usr_abc123",
        "employeeName": "Alice Johnson",
        "hoursLogged": 72.0
      }
    ]
  }
}
```

---

### `GET /api/v1/reports/department-utilization`
**Auth:** ADMIN  
**Params:** `weekStartDate` (ISO date, defaults to current Monday)

**Response:**
```json
{
  "data": [
    {
      "departmentId": "dept_eng",
      "departmentName": "Engineering",
      "employeeCount": 8,
      "totalHours": 280.0
    },
    {
      "departmentId": "dept_des",
      "departmentName": "Design",
      "employeeCount": 4,
      "totalHours": 128.0
    }
  ]
}
```

---

## Frontend Components

| Component | File | Description |
|---|---|---|
| `Organization` | `pages/Organization/Organization.jsx` | Full admin analytics dashboard |
| `reportService` | `services/reportService.js` | All report API calls + PDF export |

---

## Edge Cases

| Scenario | Behavior |
|---|---|
| No timesheets submitted for a week | Department shows 0 hours; utilization = 0% |
| Department has employees but no projects | Hours = 0; Low badge shown |
| Week in the future requested | Returns 0 data (no timesheets exist yet) |
| 6-week trend fetch — some weeks fail | Failed weeks return null; handled with `.catch(() => null)` |

---

## Future Scope

- Configurable target hours per week (not hardcoded 40h)
- Drill-down from department to individual employee in dashboard
- Date range picker (not just week selector)
- Saved/bookmarked report views
- Scheduled automated report emails
- Downloadable charts as standalone images
