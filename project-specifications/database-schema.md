# TimeKeeper — Database Schema

**Database:** `timekeeper_db`  
**Engine:** MySQL 8  
**ORM:** Hibernate (Spring Data JPA), DDL `auto=update`  
**Connection:** `jdbc:mysql://localhost:3306/timekeeper_db` (HikariCP pool)

---

## Entity Relationship Diagram

```
departments
    │
    ├──< employees (department_id FK)
    │       │
    │       ├──< timesheets (employee_id FK)
    │       │       └──< time_entries (timesheet_id FK)
    │       │               └──> projects (project_id FK)
    │       │
    │       └──< leaves (employee_id FK)
    │
    └──< projects (department_id FK)

holidays (standalone — no FK relationships)
```

---

## Tables

### `departments`

| Column | Type | Constraints |
|---|---|---|
| `id` | `VARCHAR(50)` | PK — generated as `dep_` + 8-char UUID fragment |
| `name` | `VARCHAR(100)` | NOT NULL |
| `description` | `TEXT` | NULLABLE |
| `status` | `VARCHAR(20)` | NOT NULL; enum: `ACTIVE`, `INACTIVE` |
| `created_at` | `TIMESTAMP` | Set on INSERT |

**Seed data IDs:** `dep_001` (Engineering), `dep_002` (Design)

---

### `employees`

| Column | Type | Constraints |
|---|---|---|
| `id` | `VARCHAR(50)` | PK — generated as `usr_` + 8-char UUID fragment |
| `name` | `VARCHAR(100)` | NOT NULL |
| `email` | `VARCHAR(150)` | NOT NULL, UNIQUE |
| `password` | `VARCHAR(255)` | NOT NULL — BCrypt hash |
| `role` | `VARCHAR(20)` | NOT NULL; enum: `EMPLOYEE`, `MANAGER`, `ADMIN` |
| `department_id` | `VARCHAR(50)` | FK → `departments.id`; NULLABLE |
| `manager_id` | `VARCHAR(50)` | Stores manager employee ID (non-enforced FK); NULLABLE |
| `status` | `VARCHAR(20)` | NOT NULL; enum: `ACTIVE`, `INACTIVE` |
| `created_at` | `TIMESTAMP` | Set on INSERT |

**Notes:**
- `isEnabled()` returns `true` only if `status = ACTIVE`
- `isAccountNonLocked()` returns `true` only if `status = ACTIVE`
- `manager_id` is stored as a plain String, not a JPA FK — allows circular management hierarchies without ORM complexity
- Spring Security `UserDetails` is implemented directly on this entity

**Seed data IDs:** `usr_001` (Admin), `usr_002` (Manager), `usr_003`, `usr_004` (Employees)

---

### `projects`

| Column | Type | Constraints |
|---|---|---|
| `id` | `VARCHAR(50)` | PK — generated as `prj_` + 8-char UUID fragment |
| `name` | `VARCHAR(150)` | NOT NULL |
| `client_name` | `VARCHAR(150)` | NULLABLE |
| `department_id` | `VARCHAR(50)` | FK → `departments.id`; NULLABLE |
| `start_date` | `DATE` | NULLABLE |
| `end_date` | `DATE` | NULLABLE |
| `status` | `VARCHAR(20)` | NOT NULL; enum: `ACTIVE`, `ON_HOLD`, `COMPLETED` |
| `created_at` | `TIMESTAMP` | Set on INSERT |

**Seed data IDs:** `prj_001` (Project Alpha / Acme Corp), `prj_002` (Project Beta / Globex Inc)

---

### `timesheets`

| Column | Type | Constraints |
|---|---|---|
| `id` | `VARCHAR(50)` | PK — generated as `ts_` + 8-char UUID fragment |
| `employee_id` | `VARCHAR(50)` | FK → `employees.id`; NOT NULL |
| `week_start_date` | `DATE` | NOT NULL |
| `week_end_date` | `DATE` | NOT NULL |
| `status` | `VARCHAR(20)` | NOT NULL; enum: `DRAFT`, `SUBMITTED` |
| `created_at` | `TIMESTAMP` | Set on INSERT |

**Unique constraint:** `(employee_id, week_start_date)` — one timesheet per employee per week.

---

### `time_entries`

| Column | Type | Constraints |
|---|---|---|
| `id` | `VARCHAR(50)` | PK — generated as `te_` + 8-char UUID fragment |
| `timesheet_id` | `VARCHAR(50)` | FK → `timesheets.id`; NOT NULL; CASCADE DELETE |
| `project_id` | `VARCHAR(50)` | FK → `projects.id`; NULLABLE |
| `day_of_week` | `VARCHAR(20)` | NOT NULL; enum: `MONDAY`, `TUESDAY`, `WEDNESDAY`, `THURSDAY`, `FRIDAY` |
| `entry_type` | `VARCHAR(20)` | NOT NULL; enum: `WORK`, `LEAVE`, `HOLIDAY` |
| `start_time` | `TIME` | NULLABLE |
| `end_time` | `TIME` | NULLABLE |
| `hours_logged` | `DECIMAL(4,2)` | NULLABLE — total hours for the entry |
| `description` | `TEXT` | NULLABLE — user notes |

**Notes:**
- `project_id` may be null for `LEAVE` or `HOLIDAY` entry types
- `start_time` and `end_time` are stored but UI currently uses `hours_logged` directly
- Cascade DELETE ensures all entries are removed when the parent timesheet is deleted

---

### `leaves`

| Column | Type | Constraints |
|---|---|---|
| `id` | `VARCHAR(50)` | PK — generated as `lv_` + 8-char UUID fragment |
| `employee_id` | `VARCHAR(50)` | FK → `employees.id`; NOT NULL |
| `start_date` | `DATE` | NOT NULL |
| `end_date` | `DATE` | NOT NULL |
| `leave_type` | `VARCHAR(20)` | NOT NULL; enum: `SICK`, `CASUAL`, `VACATION` |
| `status` | `VARCHAR(20)` | NOT NULL; enum: `PENDING`, `APPROVED`, `REJECTED` |
| `reason` | `TEXT` | NULLABLE |
| `approved_by` | `VARCHAR(50)` | NULLABLE — Manager/Admin employee ID who actioned the leave |
| `rejection_reason` | `TEXT` | NULLABLE |
| `created_at` | `TIMESTAMP` | Set on INSERT |

**Notes:**
- `approved_by` is a plain string ID (same pattern as `manager_id` in employees)
- Status defaults to `PENDING` on INSERT
- Overlapping leave detection is performed in the service layer (checks date ranges against existing PENDING/APPROVED leaves)
- Leaves falling on holidays are warned about but not blocked

---

### `holidays`

| Column | Type | Constraints |
|---|---|---|
| `id` | `VARCHAR(50)` | PK — generated as `hol_` + 8-char UUID fragment |
| `name` | `VARCHAR(100)` | NOT NULL |
| `date` | `DATE` | NOT NULL, UNIQUE |
| `description` | `TEXT` | NULLABLE |

**Notes:**
- The `date` column has a UNIQUE constraint — only one holiday per calendar date
- `HolidayRepository` is queried by `LeaveServiceImpl` to warn about holiday-overlapping leaves
- No foreign key relationships to other tables

---

## ID Generation Pattern

All IDs are **application-generated strings** (not auto-increment integers or database UUIDs). Generated in `@PrePersist` hooks:

| Entity | ID Prefix | Example |
|---|---|---|
| `Employee` | `usr_` | `usr_a1b2c3d4` |
| `Department` | `dep_` | `dep_a1b2c3d4` |
| `Project` | `prj_` | `prj_a1b2c3d4` |
| `Timesheet` | `ts_` | `ts_a1b2c3d4` |
| `TimeEntry` | `te_` | `te_a1b2c3d4` |
| `Leave` | `lv_` | `lv_a1b2c3d4` |
| `Holiday` | `hol_` | `hol_a1b2c3d4` |

**Format:** prefix + first 8 chars of a random `UUID.randomUUID().toString()` fragment.

---

## Hibernate Configuration

```properties
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.format_sql=false
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQL8Dialect
```

`ddl-auto=update` means Hibernate will create missing tables and add new columns automatically on startup, but it will **not drop or modify existing columns**. For production, use `validate` and manage schema via Flyway/Liquibase migrations.

---

## Data Initialization (`DataInitializer`)

On first run, `DataInitializer` (`CommandLineRunner`) seeds:

| Entity | Seed Records |
|---|---|
| Departments | Engineering (`dep_001`), Design (`dep_002`) |
| Employees | Admin (`usr_001`), Manager (`usr_002`), 2 × Employee (`usr_003`, `usr_004`) |
| Projects | Project Alpha (`prj_001`), Project Beta (`prj_002`) |

The initializer checks for existing records before inserting to avoid duplicate seed on restart.

---

## Indexes (Hibernate-managed)

| Table | Column(s) | Type |
|---|---|---|
| `employees` | `email` | UNIQUE |
| `timesheets` | `(employee_id, week_start_date)` | UNIQUE |
| `holidays` | `date` | UNIQUE |

---

## Migration Notes (Production Readiness)

1. Replace `ddl-auto=update` with `ddl-auto=validate`
2. Introduce Flyway or Liquibase for versioned schema migrations
3. Add explicit indexes on frequently queried columns: `employees.status`, `timesheets.status`, `leaves.status`, `time_entries.timesheet_id`
4. Add `deleted_at` soft-delete column on `employees` and `departments` instead of hard status changes
5. Enforce FK on `employees.manager_id` → `employees.id` once circular reference risk is assessed
