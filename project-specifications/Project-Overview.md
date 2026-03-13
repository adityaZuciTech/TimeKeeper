# TIMEKEEPER – PRODUCT FLOW & FEATURES DOCUMENT

## 1. Product Overview

TimeKeeper is a web-based time tracking application designed to help organizations track how employees spend their time on projects. The system allows employees to log their working hours, helps managers understand team utilization, and enables admins to monitor organization-wide project effort and department workload.

### Primary Objectives

* Track employee working hours
* Allocate work hours to projects
* Monitor department utilization
* Provide organization-level reporting
* Improve resource visibility across projects

---

## 2. User Roles

### Employee

* Log daily working hours
* Allocate hours to projects
* Submit weekly timesheet
* View past timesheets

### Manager

* View team members
* View team timesheets
* Monitor team hours
* View project effort reports

### Admin

* Create and manage departments
* Create and manage employees
* Create and manage projects
* Change project status
* View organization-wide utilization and reports

---

## 3. System Navigation Structure

### Employee Navigation

* Dashboard
* My Timesheets
* Profile

### Manager Navigation

* Dashboard
* Team Timesheets
* Team Overview
* Reports

### Admin Navigation

* Dashboard
* Employees
* Departments
* Projects
* Organization Overview
* Reports

---

## 4. Employee Flow

### Step 1 – Login

Employee logs into TimeKeeper using email and password.

After successful login, the employee is redirected to the **Dashboard**.

---

## 5. Employee Dashboard

The dashboard displays the last **5 weeks of timesheets**.

| Week            | Total Hours Logged | Status    | Action         |
| --------------- | ------------------ | --------- | -------------- |
| Mar 10 – Mar 14 | 38                 | Submitted | View           |
| Mar 3 – Mar 7   | 40                 | Submitted | View           |
| Feb 24 – Feb 28 | 0                  | Draft     | Fill Timesheet |

### Timesheet Status Types

**Draft**
Timesheet not submitted yet.

**Submitted**
Timesheet completed and locked.

### Available Actions

* Fill Timesheet
* Edit Draft
* View Submitted

---

## 6. Timesheet Creation Flow

When the employee clicks **Fill Timesheet** or **Edit Draft**, the system redirects to the **My Timesheet page**.

---

## 7. My Timesheet Page Structure

The timesheet is organized by weekdays.

### Days Included

* Monday
* Tuesday
* Wednesday
* Thursday
* Friday

### Example Layout

| Day       | Time Allocation                                    | Total Hours |
| --------- | -------------------------------------------------- | ----------- |
| Monday    | Project A (10:00–13:00)<br>Project B (14:00–19:00) | 8           |
| Tuesday   | Project A (09:00–17:00)                            | 8           |
| Wednesday | Leave                                              | 0           |

---

## 8. Time Entry Method

Employees log work using **time blocks**.

Each time block includes:

* Project
* Start Time
* End Time
* Optional Description

### Example

Project: Project A
Start Time: 10:00
End Time: 13:00

Project: Project B
Start Time: 14:00
End Time: 19:00

---

## 9. System Validation Rules

Maximum working hours per day: **8 hours**

Rules enforced by the system:

* Total daily hours cannot exceed 8
* Time blocks cannot overlap
* Start time must be earlier than end time
* Leave days cannot contain time blocks

---

## 10. Leave Selection

For each day, employees can select a status.

### Available Options

* Work
* Leave
* Holiday

If **Leave** **Holiday** is selected:

* Time entry is disabled
* Total hours become **0**

---

## 11. Weekly Summary

At the bottom of the timesheet, a weekly summary is displayed.

Example:

Monday: 8 hours
Tuesday: 8 hours
Wednesday: 0 hours
Thursday: 8 hours
Friday: 8 hours

**Total Weekly Hours: 32 hours**

---

## 12. Timesheet Submission

After completing the week, the employee clicks:

**Submit Timesheet**

System behavior after submission:

* Status becomes **Submitted**
* Timesheet becomes **read-only**
* The timesheet appears in historical records

---

## 13. Email Reminders

If a timesheet is not submitted by the end of the week, the system sends reminder emails.

### Reminder Schedule

* Friday Evening
* Monday Morning

### Example Email

**Subject:** Reminder – Submit Your Weekly Timesheet

Hello,

Your timesheet for the week is still incomplete.
Please log into TimeKeeper and submit your timesheet.

---

## 14. Manager Flow

Managers can view team activity but **cannot approve or reject timesheets**.

### Manager Dashboard Includes

* Team members list
* Weekly hours summary
* Access to team timesheets

### Team Overview Example

| Employee | Hours This Week |
| -------- | --------------- |
| John     | 38              |
| Sarah    | 40              |
| Alex     | 35              |

Managers can click an employee to view their timesheet details.

---

## 15. Admin Flow

Admin dashboard allows full **organization management**.

### Employee Management

Admin can:

* Create employees
* Assign department
* Assign manager
* Activate or deactivate employees

### Employee Fields

* Name
* Email
* Department
* Role

---

## 16. Department Management

Admin can create and manage departments.

### Example Departments

* Engineering
* Design
* Marketing
* Finance

Departments help group employees and manage project visibility.

---

## 17. Project Management

Admin can create projects.

### Project Fields

* Project Name
* Client Name
* Department
* Start Date
* End Date
* Status

### Project Status Options

* Active
* On Hold
* Completed

If a project is marked **Completed**:

* Employees cannot log new time to the project
* The project disappears from the timesheet dropdown
* Historical records remain unchanged

---

## 18. Organization Overview (Admin)

Admin can view **department-level utilization**.

| Department  | Employees | Total Hours This Week |
| ----------- | --------- | --------------------- |
| Engineering | 15        | 520                   |
| Design      | 6         | 180                   |
| Marketing   | 5         | 140                   |

Admin can drill down into departments to see employee hours.

---

## 19. Department Detail View

Admin selects a department and sees employee utilization.

| Employee | Role      | Hours This Week |
| -------- | --------- | --------------- |
| John     | Developer | 38              |
| Sarah    | Developer | 40              |
| Alex     | QA        | 35              |

Admin can open employee timesheets for detailed work allocation.

---

## 20. Reports & Analytics

The system provides basic reports.

### Employee Utilization

Shows total hours logged by employees.

### Project Effort Report

Shows total hours spent on a project.
