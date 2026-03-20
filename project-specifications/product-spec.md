# TimeKeeper Product Specification

> **Note:** This document is a legacy planning artifact. For the current production-grade documentation, refer to the following files:
> - [product-overview.md](product-overview.md) — full tech stack, navigation, in/out scope
> - [feature-list.md](feature-list.md) — complete feature inventory with implementation status
> - [user-roles-and-permissions.md](user-roles-and-permissions.md) — permission matrix and security model
> - [architecture.md](architecture.md) — system design and request lifecycle
> - [api-specification.md](api-specification.md) — complete API reference

---

## Overview

TimeKeeper enables organizations to track employee time allocation across projects in order to understand resource utilization and project effort.

---

## Core Objectives

* Track employee working hours
* Allocate work hours to projects
* Monitor department utilization
* Provide organization-level reporting
* Improve resource visibility

---

## User Roles

### Employee

Logs daily work hours and submits weekly timesheets.

### Manager

Monitors team utilization and views timesheets.

### Admin

Manages employees, departments, projects, and reports.

---

## Employee Flow

1. Login to system
2. Open dashboard
3. View last 5 weeks timesheets
4. Open weekly timesheet
5. Log time blocks per day
6. Submit timesheet

---

## Timesheet Structure

Week: Monday → Friday

Example:

| Day       | Time Allocation                      | Total |
| --------- | ------------------------------------ | ----- |
| Monday    | Project A (10–13), Project B (14–19) | 8     |
| Tuesday   | Project A (09–17)                    | 8     |
| Wednesday | Leave                                | 0     |

---

## Validation Rules

* Max 8 hours per day
* No overlapping time blocks
* Leave days cannot contain work entries
* Start time must be before end time

---

## Project Lifecycle

Project Status:

* Active
* On Hold
* Completed

Completed projects cannot receive new time entries.

---

## Reports

System provides:

* Employee utilization
* Department workload
* Project effort tracking
