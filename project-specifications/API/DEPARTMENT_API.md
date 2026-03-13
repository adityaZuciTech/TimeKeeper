# TimeKeeper – Department APIs

This document defines the Department Management APIs used in the TimeKeeper system.

Base URL

```
/api/v1
```

Access Control

```
ADMIN → Full access
MANAGER → Read only
EMPLOYEE → No access
```

Departments are used to organize employees and projects.

Example departments:

```
Engineering
Design
Marketing
Finance
```

---

# 1. Create Department

Creates a new department.

**Endpoint**

```
POST /api/v1/departments
```

**Access**

```
ADMIN
```

**Request Body**

```json
{
  "name": "Engineering",
  "description": "Software development department"
}
```

**Fields**

| Field | Description |
|------|-------------|
| name | Department name |
| description | Optional description |

**Success Response**

HTTP Status

```
201 Created
```

```json
{
  "id": "dep_01",
  "name": "Engineering",
  "description": "Software development department",
  "status": "ACTIVE"
}
```

---

# 2. Get Department By ID

Fetch details of a specific department.

**Endpoint**

```
GET /api/v1/departments/{departmentId}
```

Example

```
GET /api/v1/departments/dep_01
```

**Access**

```
ADMIN
MANAGER
```

**Response**

```json
{
  "id": "dep_01",
  "name": "Engineering",
  "description": "Software development department",
  "status": "ACTIVE"
}
```

---

# 3. List Departments

Returns all departments.

**Endpoint**

```
GET /api/v1/departments
```

**Access**

```
ADMIN
MANAGER
```

**Response**

```json
{
  "departments": [
    {
      "id": "dep_01",
      "name": "Engineering",
      "description": "Software development department",
      "status": "ACTIVE"
    },
    {
      "id": "dep_02",
      "name": "Design",
      "description": "UI/UX design team",
      "status": "ACTIVE"
    }
  ]
}
```

---

# 4. Update Department

Updates department information.

**Endpoint**

```
PUT /api/v1/departments/{departmentId}
```

Example

```
PUT /api/v1/departments/dep_01
```

**Access**

```
ADMIN
```

**Request Body**

```json
{
  "name": "Engineering & Development",
  "description": "Full software engineering team"
}
```

**Response**

```json
{
  "id": "dep_01",
  "name": "Engineering & Development",
  "description": "Full software engineering team"
}
```

---

# 5. Deactivate Department

Departments should not be deleted because employees and projects may reference them.

**Endpoint**

```
PATCH /api/v1/departments/{departmentId}/deactivate
```

Example

```
PATCH /api/v1/departments/dep_01/deactivate
```

**Access**

```
ADMIN
```

**Response**

```json
{
  "id": "dep_01",
  "status": "INACTIVE"
}
```

**Behavior**

```
Inactive departments cannot be assigned to new employees or projects
Existing historical data remains unchanged
```

---

# 6. Get Employees in a Department

Returns employees belonging to a department.

**Endpoint**

```
GET /api/v1/departments/{departmentId}/employees
```

Example

```
GET /api/v1/departments/dep_01/employees
```

**Access**

```
ADMIN
MANAGER
```

**Response**

```json
{
  "departmentId": "dep_01",
  "employees": [
    {
      "id": "usr_101",
      "name": "John Doe",
      "role": "EMPLOYEE"
    },
    {
      "id": "usr_102",
      "name": "Sarah Lee",
      "role": "MANAGER"
    }
  ]
}
```

---

# Department Table (Database)

```
departments
------------
id
name
description
status
created_at
```

Status values

```
ACTIVE
INACTIVE
```

---

# Department APIs Summary

```
POST   /api/v1/departments
GET    /api/v1/departments
GET    /api/v1/departments/{id}
PUT    /api/v1/departments/{id}
PATCH  /api/v1/departments/{id}/deactivate
GET    /api/v1/departments/{id}/employees
```