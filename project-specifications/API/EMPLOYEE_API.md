# TimeKeeper – Employee APIs

This document defines the Employee Management APIs used in the TimeKeeper system.

Base URL

```
/api/v1
```

Access Control

```
ADMIN   → Full access
MANAGER → Read team members
EMPLOYEE → Access own profile and change password
```

---

# 1. Create Employee

Creates a new employee in the system.

**Endpoint**

```
POST /api/v1/employees
```

**Access**

```
ADMIN
```

**Request Body**

```json
{
  "name": "John Doe",
  "email": "john@company.com",
  "password": "TempPassword123",
  "role": "EMPLOYEE",
  "departmentId": "dep_01",
  "managerId": "usr_200"
}
```

**Fields**

| Field | Description |
|------|-------------|
| name | Employee full name |
| email | Employee login email |
| password | Temporary password set by admin |
| role | EMPLOYEE / MANAGER / ADMIN |
| departmentId | Department of employee |
| managerId | Reporting manager ID (nullable) |

**Success Response**

HTTP Status

```
201 Created
```

```json
{
  "id": "usr_101",
  "name": "John Doe",
  "email": "john@company.com",
  "role": "EMPLOYEE",
  "departmentId": "dep_01",
  "managerId": "usr_200",
  "status": "ACTIVE"
}
```

---

# 2. Get Employee By ID

Fetch details of a specific employee.

**Endpoint**

```
GET /api/v1/employees/{employeeId}
```

Example

```
GET /api/v1/employees/usr_101
```

**Access**

```
ADMIN
MANAGER
EMPLOYEE (only own profile)
```

**Response**

```json
{
  "id": "usr_101",
  "name": "John Doe",
  "email": "john@company.com",
  "role": "EMPLOYEE",
  "department": {
    "id": "dep_01",
    "name": "Engineering"
  },
  "managerId": "usr_200",
  "status": "ACTIVE"
}
```

---

# 3. List Employees

Returns a list of employees.

**Endpoint**

```
GET /api/v1/employees
```

**Access**

```
ADMIN
```

**Optional Query Parameters**

```
departmentId
role
status
```

Example

```
GET /api/v1/employees?departmentId=dep_01
```

**Response**

```json
{
  "employees": [
    {
      "id": "usr_101",
      "name": "John Doe",
      "email": "john@company.com",
      "role": "EMPLOYEE",
      "departmentId": "dep_01",
      "managerId": "usr_200",
      "status": "ACTIVE"
    },
    {
      "id": "usr_102",
      "name": "Sarah Lee",
      "email": "sarah@company.com",
      "role": "MANAGER",
      "departmentId": "dep_01",
      "managerId": null,
      "status": "ACTIVE"
    }
  ]
}
```

---

# 4. Update Employee

Updates employee information.

**Endpoint**

```
PUT /api/v1/employees/{employeeId}
```

Example

```
PUT /api/v1/employees/usr_101
```

**Access**

```
ADMIN
```

**Request Body**

```json
{
  "name": "John Smith",
  "departmentId": "dep_02",
  "managerId": "usr_210"
}
```

**Response**

```json
{
  "id": "usr_101",
  "name": "John Smith",
  "email": "john@company.com",
  "departmentId": "dep_02",
  "managerId": "usr_210"
}
```

---

# 5. Deactivate Employee

Employees are not deleted. Instead they are deactivated.

**Endpoint**

```
PATCH /api/v1/employees/{employeeId}/deactivate
```

Example

```
PATCH /api/v1/employees/usr_101/deactivate
```

**Access**

```
ADMIN
```

**Response**

```json
{
  "id": "usr_101",
  "status": "INACTIVE"
}
```

**Behavior**

```
Inactive employees cannot log in
Historical timesheet data remains
```

---

# 6. Get Team Members

Returns employees reporting to the logged-in manager.

**Endpoint**

```
GET /api/v1/employees/team
```

**Access**

```
MANAGER
```

Manager ID is automatically determined from the JWT token.

**Response**

```json
{
  "teamMembers": [
    {
      "id": "usr_101",
      "name": "John Doe",
      "departmentId": "dep_01"
    },
    {
      "id": "usr_103",
      "name": "Alex Brown",
      "departmentId": "dep_01"
    }
  ]
}
```

---

# 7. Change Password

Allows employee to update password.

**Endpoint**

```
PATCH /api/v1/employees/change-password
```

**Access**

```
EMPLOYEE
MANAGER
ADMIN
```

**Request Body**

```json
{
  "currentPassword": "TempPassword123",
  "newPassword": "NewSecurePassword456"
}
```

**Response**

```json
{
  "message": "Password updated successfully"
}
```

---

# Employee Table (Database)

```
employees
---------
id
name
email
password
role
department_id
manager_id
status
created_at
```

Role values

```
EMPLOYEE
MANAGER
ADMIN
```

Status values

```
ACTIVE
INACTIVE
```