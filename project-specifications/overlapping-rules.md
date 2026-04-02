# Time Entry Validation Rules

The system must prevent invalid or overlapping time entries.

---

# Rule 1 – Maximum 8 Hours Per Day

For each employee per day:

```
Total hours_logged ≤ 8
```

Example

Valid

```
10:00–13:00 → 3 hours
14:00–19:00 → 5 hours

Total = 8
```

Invalid

```
09:00–13:00 → 4 hours
14:00–20:00 → 6 hours

Total = 10
```

---

# Rule 2 – No Overlapping Time Blocks

Time entries for the same day must not overlap.

Invalid Example

```
Project A → 10:00–13:00
Project B → 12:00–15:00
```

Valid Example

```
Project A → 10:00–13:00
Project B → 13:00–17:00
```

**Manual entry (addEntry / updateEntry):** Back-to-back entries are allowed. The overlap condition is exclusive: `newStart < existEnd AND newEnd > existStart`. Boundary-touching (e.g. 09:00–11:00 → 11:00–13:00) is not blocked.

**Copy Last Week path (copyFromPreviousWeek):** STRICT/inclusive semantics. Boundary-touching IS treated as overlap (`newStart ≤ existEnd AND newEnd ≥ existStart`). The copy path is deliberately more conservative to prevent ambiguous back-to-back entries from being silently merged. Affected entries are skipped as `OVERLAP_STRICT` and shown in the copy summary panel.

---

# Rule 3 – Start Time Must Be Before End Time

Invalid

```
start_time = 15:00
end_time   = 12:00
```

Valid

```
start_time = 10:00
end_time   = 13:00
```

---

# Rule 4 – Leave or Holiday Days

If `entry_type` is:

```
LEAVE
HOLIDAY
```

Then

```
project_id  = NULL
start_time  = NULL
end_time    = NULL
hours_logged = 0
```

Only **one entry per day** is allowed for leave or holiday.

---

# Rule 5 – Submitted Timesheets Cannot Be Edited

If timesheet status =

```
SUBMITTED
```

Then the following actions are blocked:

```
Add time entry
Update entry
Delete entry
Change leave status
```

Timesheet becomes **read-only**.

---

# Backend Validation Logic

Before inserting a new time entry:

1. Fetch all entries for the same

```
timesheet_id
day
```

2. Check overlap condition

```
new_start < existing_end
AND
new_end > existing_start
```

If true → reject request.

---

# Example Day Record

Monday

```
Entry 1
Project A
10:00 – 13:00
3 hours

Entry 2
Project B
14:00 – 19:00
5 hours
```

Total

```
8 hours
```