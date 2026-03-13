# TimeKeeper – Product Navigation

## Overview

This document defines the navigation structure for the TimeKeeper application based on user roles.  
Managers are treated as employees with additional permissions.

User roles:

- Employee
- Manager (Employee with additional access)
- Admin


---

# 1. Employee Navigation

Employees focus only on logging and managing their own timesheets.

```
Dashboard
Timesheets
Profile
```

## Dashboard

Purpose:

- Provide quick access to recent weekly timesheets.

The dashboard displays the **last 5 timesheets**.

Example:

| Week | Total Hours | Status | Action |
|-----|-----|-----|-----|
| Mar 10 – Mar 14 | 32 | Submitted | View |
| Mar 3 – Mar 7 | 40 | Submitted | View |
| Feb 24 – Feb 28 | 28 | Draft | Edit |
| Feb 17 – Feb 21 | 40 | Submitted | View |
| Feb 10 – Feb 14 | 36 | Submitted | View |

Status types:

- Draft
- Submitted

Actions:

- Edit (for Draft)
- View (for Submitted)

---

## Timesheets

Purpose:

Allow employees to create and manage weekly timesheets.

Structure:

```
Timesheets
 ├ Current Week
 └ Previous Weeks
```

Employees can:

- Add time entries
- Edit entries
- Delete entries
- Mark leave days
- Save draft
- Submit timesheet

Rules:

- Max 8 hours per day
- Multiple projects allowed per day
- Time blocks cannot overlap

---

## Profile

Displays employee information.

Fields:

- Name
- Email
- Department
- Role


---

# 2. Manager Navigation

Managers use the same navigation as employees with one additional section for team visibility.

```
Dashboard
Timesheets
Team
Profile
```

## Team

Purpose:

Allow managers to monitor their team’s work hours and timesheets.

Example team view:

| Employee | Hours This Week |
|--------|--------|
| John | 38 |
| Sarah | 40 |
| Alex | 35 |

Managers can:

- View employee timesheets
- Check weekly hours

Managers **cannot edit employee timesheets**.


---

# 3. Admin Navigation

Admins have organization management capabilities.

```
Dashboard
Timesheets
Team
Employees
Departments
Projects
Organization
Profile
```

## Employees

Admin can:

- Create employee
- Edit employee
- Activate or deactivate employee

Employee fields:

- Name
- Email
- Department
- Role

---

## Departments

Admin can manage departments.

Actions:

- Create department
- Edit department
- View department employees

Example departments:

- Engineering
- Design
- Marketing
- Finance

---

## Projects

Admin manages projects.

Project fields:

- Project Name
- Client Name
- Department
- Start Date
- End Date
- Status

Project status types:

- Active
- On Hold
- Completed

Rules:

- Employees can log time only on **Active projects**
- Completed projects are **hidden from timesheet dropdown**

---

## Organization

Provides department-level utilization overview.

Example:

| Department | Employees | Hours This Week |
|-----------|-----------|-----------|
| Engineering | 15 | 520 |
| Design | 6 | 180 |
| Marketing | 5 | 140 |

Admin can drill down:

```
Department → Employees → Timesheets
```

---

# Navigation Summary

## Employee

```
Dashboard
Timesheets
Profile
```

## Manager

```
Dashboard
Timesheets
Team
Profile
```

## Admin

```
Dashboard
Timesheets
Team
Employees
Departments
Projects
Organization
Profile
```