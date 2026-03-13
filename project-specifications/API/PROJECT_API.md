# TimeKeeper – Project APIs

This document defines the Project Management APIs used in the TimeKeeper system.

Base URL

```
/api/v1
```

Access Control

```
ADMIN   → Full access
MANAGER → Read access
EMPLOYEE → Read access (only active projects)
```

Projects belong to a **department** and employees log **time entries** against projects.

---

# 1. Create Project

Creates a new project.

**Endpoint**

```
POST /api/v1/projects
```

**Access**

```
ADMIN
```

---

**Request Body**

```json
{
  "name": "Project Alpha",
  "clientName": "Acme Corp",
  "departmentId": "dep_01",
  "startDate": "2026-03-01",
  "endDate": "2026-08-30"
}
```

**Fields**

| Field | Description |
|------|-------------|
| name | Project name |
| clientName | Client organization |
| departmentId | Department responsible |
| startDate | Project start date |
| endDate | Project end date |

---

**Success Response**

HTTP Status

```
201 Created
```

```json
{
  "id": "prj_101",
  "name": "Project Alpha",
  "clientName": "Acme Corp",
  "departmentId": "dep_01",
  "startDate": "2026-03-01",
  "endDate": "2026-08-30",
  "status": "ACTIVE"
}
```

---

# 2. Get Project By ID

Fetch details of a specific project.

**Endpoint**

```
GET /api/v1/projects/{projectId}
```

Example

```
GET /api/v1/projects/prj_101
```

**Access**

```
ADMIN
MANAGER
EMPLOYEE
```

---

**Response**

```json
{
  "id": "prj_101",
  "name": "Project Alpha",
  "clientName": "Acme Corp",
  "department": {
    "id": "dep_01",
    "name": "Engineering"
  },
  "startDate": "2026-03-01",
  "endDate": "2026-08-30",
  "status": "ACTIVE"
}
```

---

# 3. List Projects

Returns projects based on filters.

**Endpoint**

```
GET /api/v1/projects
```

**Access**

```
ADMIN
MANAGER
EMPLOYEE
```

---

**Optional Query Parameters**

```
departmentId
status
```

Example

```
GET /api/v1/projects?departmentId=dep_01
```

---

**Response**

```json
{
  "projects": [
    {
      "id": "prj_101",
      "name": "Project Alpha",
      "clientName": "Acme Corp",
      "departmentId": "dep_01",
      "status": "ACTIVE"
    },
    {
      "id": "prj_102",
      "name": "Project Beta",
      "clientName": "Globex",
      "departmentId": "dep_01",
      "status": "ON_HOLD"
    }
  ]
}
```

---

# 4. Update Project

Updates project information.

**Endpoint**

```
PUT /api/v1/projects/{projectId}
```

Example

```
PUT /api/v1/projects/prj_101
```

**Access**

```
ADMIN
```

---

**Request Body**

```json
{
  "name": "Project Alpha V2",
  "clientName": "Acme Corporation",
  "endDate": "2026-09-30"
}
```

---

**Response**

```json
{
  "id": "prj_101",
  "name": "Project Alpha V2",
  "clientName": "Acme Corporation",
  "endDate": "2026-09-30"
}
```

---

# 5. Update Project Status

Changes the status of a project.

**Endpoint**

```
PATCH /api/v1/projects/{projectId}/status
```

Example

```
PATCH /api/v1/projects/prj_101/status
```

---

**Request Body**

```json
{
  "status": "COMPLETED"
}
```

---

**Status Values**

```
ACTIVE
ON_HOLD
COMPLETED
```

---

**Response**

```json
{
  "id": "prj_101",
  "status": "COMPLETED"
}
```

---

**Behavior**

```
ACTIVE → Visible in timesheet dropdown
ON_HOLD → Visible but marked inactive
COMPLETED → Hidden from timesheet logging
Historical time logs remain unchanged
```

---

# 6. Get Projects for Timesheet Dropdown

Returns only **active projects** available for time logging.

**Endpoint**

```
GET /api/v1/projects/active
```

**Access**

```
EMPLOYEE
MANAGER
ADMIN
```

---

**Optional Filter**

```
departmentId
```

Example

```
GET /api/v1/projects/active?departmentId=dep_01
```

---

**Response**

```json
{
  "projects": [
    {
      "id": "prj_101",
      "name": "Project Alpha"
    },
    {
      "id": "prj_104",
      "name": "Project Gamma"
    }
  ]
}
```

---

# 7. Project Effort Summary

Returns total hours logged for a project.

**Endpoint**

```
GET /api/v1/projects/{projectId}/effort
```

Example

```
GET /api/v1/projects/prj_101/effort
```

---

**Response**

```json
{
  "projectId": "prj_101",
  "projectName": "Project Alpha",
  "totalHoursLogged": 520
}
```

---

# Project Table (Database)

```
projects
---------
id
name
client_name
department_id
start_date
end_date
status
created_at
```

---

# Project APIs Summary

```
POST   /api/v1/projects
GET    /api/v1/projects
GET    /api/v1/projects/{id}
PUT    /api/v1/projects/{id}
PATCH  /api/v1/projects/{id}/status
GET    /api/v1/projects/active
GET    /api/v1/projects/{id}/effort
```