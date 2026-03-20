# TimeKeeper – Final API Specification

Base URL

```
/api/v1
```

---

# 1. Authentication APIs

```
POST /auth/login
POST /auth/logout
POST /auth/change-password
```

Purpose

```
User login
User logout
Password update
```

---

# 2. Employee APIs (Admin)

```
POST   /employees
GET    /employees
GET    /employees/{employeeId}
PUT    /employees/{employeeId}
PATCH  /employees/{employeeId}/status
```

Purpose

```
Create employee
List employees
Get employee details
Update employee
Activate / deactivate employee
```

---

# 3. Department APIs (Admin)

```
POST   /departments
GET    /departments
GET    /departments/{departmentId}
PUT    /departments/{departmentId}
PATCH  /departments/{departmentId}/status
```

Purpose

```
Create department
List departments
Get department details
Update department
Activate / deactivate department
```

---

# 4. Project APIs (Admin)

```
POST   /projects
GET    /projects
GET    /projects/{projectId}
PUT    /projects/{projectId}
PATCH  /projects/{projectId}/status
```

Purpose

```
Create project
List projects
Get project details
Update project
Change project status
```

---

# 5. Dashboard API (Employee)

```
GET /dashboard/timesheets
```

Purpose

```
Returns last 5 timesheets of logged in employee
```

---

# 6. Timesheet APIs

```
POST  /timesheets
GET   /timesheets/{timesheetId}
GET   /timesheets?weekStartDate={date}
POST  /timesheets/{timesheetId}/submit
```

Purpose

```
Create weekly timesheet
Get timesheet by ID
Get timesheet by week
Submit timesheet
```

---

# 7. Time Entry APIs

```
POST   /timesheets/{timesheetId}/entries
GET    /timesheets/{timesheetId}/entries
PUT    /timesheets/{timesheetId}/entries/{entryId}
DELETE /timesheets/{timesheetId}/entries/{entryId}
```

Purpose

```
Add time entry
List entries of a timesheet
Update entry
Delete entry
```

---

# 8 Manager APIs

```
GET /employees/{managerId}/team
GET /employees/{managerId}/team/timesheets
GET /employees/{employeeId}/timesheets
```

Purpose

```
Get employees reporting to a manager
View team weekly hours
View timesheets of a specific employee
```

---

# 9. Admin Organization Overview APIs

```
GET /admin/departments
GET /admin/departments/{departmentId}/employees
GET /admin/projects
```

Purpose

```
Department utilization
Employees in department
Project effort overview
```

---

# API Count Summary

```
Authentication        → 3
Employees             → 5
Departments           → 5
Projects              → 5
Dashboard             → 1
Timesheets            → 4
Time Entries          → 4
Manager               → 3
Admin Overview        → 3
```

Total APIs

```
33 APIs
```

---

# Resource Hierarchy

```
Department
   └── Employees
   └── Projects

Employee
   └── Timesheets

Timesheet
   └── TimeEntries

Project
   └── TimeEntries
```

---

# API Modules

```
Auth
Employees
Departments
Projects
Dashboard
Timesheets
TimeEntries
Manager
Admin
```