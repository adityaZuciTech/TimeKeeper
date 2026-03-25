-- =============================================================================
-- TimeKeeper – Timesheet Seed Script (MySQL)
-- Run this AFTER the application has started at least once (so Hibernate
-- creates all tables via ddl-auto=update) and the DataInitializer has seeded
-- departments, employees, and projects.
--
-- If you used DataInitializer (default), this script is only needed if you
-- want to re-insert the rows manually (e.g., after truncating the tables).
-- =============================================================================

USE timekeeper_db;

-- Ensure this session uses utf8mb4 so that any multi-byte / emoji text
-- is stored and retrieved correctly.
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Insert 5 timesheets
-- ──────────────────────────────────────────────────────────────────────────────
INSERT IGNORE INTO timesheets (id, employee_id, week_start_date, week_end_date, status, created_at) VALUES
  ('ts_seed_01', 'usr_003', '2026-02-09', '2026-02-15', 'SUBMITTED', '2026-02-09 09:00:00'),
  ('ts_seed_02', 'usr_003', '2026-02-16', '2026-02-22', 'SUBMITTED', '2026-02-16 09:00:00'),
  ('ts_seed_03', 'usr_004', '2026-03-02', '2026-03-08', 'SUBMITTED', '2026-03-02 09:00:00'),
  ('ts_seed_04', 'usr_002', '2026-03-09', '2026-03-15', 'SUBMITTED', '2026-03-09 09:00:00'),
  ('ts_seed_05', 'usr_003', '2026-03-09', '2026-03-15', 'DRAFT',     '2026-03-09 09:00:00');

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Insert time entries for each timesheet
--    Columns: id, timesheet_id, project_id, day_of_week, entry_type,
--             start_time, end_time, hours_logged, description
-- ──────────────────────────────────────────────────────────────────────────────

-- Timesheet 1: John Developer, week 2026-02-09 (SUBMITTED)
INSERT IGNORE INTO time_entries (id, timesheet_id, project_id, day_of_week, entry_type, start_time, end_time, hours_logged, description) VALUES
  ('te_s01_1', 'ts_seed_01', 'prj_001', 'MONDAY',    'WORK', '09:00:00', '17:00:00', 8.00, 'Sprint planning & dev'),
  ('te_s01_2', 'ts_seed_01', 'prj_001', 'TUESDAY',   'WORK', '09:00:00', '17:30:00', 8.50, 'Feature development'),
  ('te_s01_3', 'ts_seed_01', 'prj_002', 'WEDNESDAY', 'WORK', '09:00:00', '17:00:00', 8.00, 'API integration'),
  ('te_s01_4', 'ts_seed_01', 'prj_001', 'THURSDAY',  'WORK', '09:00:00', '18:00:00', 9.00, 'Bug fixes'),
  ('te_s01_5', 'ts_seed_01', 'prj_001', 'FRIDAY',    'WORK', '09:00:00', '16:00:00', 7.00, 'Code review & docs');

-- Timesheet 2: John Developer, week 2026-02-16 (SUBMITTED)
INSERT IGNORE INTO time_entries (id, timesheet_id, project_id, day_of_week, entry_type, start_time, end_time, hours_logged, description) VALUES
  ('te_s02_1', 'ts_seed_02', 'prj_001', 'MONDAY',    'WORK', '09:00:00', '17:00:00', 8.00, 'Backend development'),
  ('te_s02_2', 'ts_seed_02', 'prj_002', 'TUESDAY',   'WORK', '09:00:00', '17:00:00', 8.00, 'Unit testing'),
  ('te_s02_3', 'ts_seed_02', 'prj_001', 'WEDNESDAY', 'WORK', '09:00:00', '17:00:00', 8.00, 'Feature implementation');

-- Timesheet 3: Alex QA, week 2026-03-02 (SUBMITTED)
INSERT IGNORE INTO time_entries (id, timesheet_id, project_id, day_of_week, entry_type, start_time, end_time, hours_logged, description) VALUES
  ('te_s03_1', 'ts_seed_03', 'prj_002', 'MONDAY',    'WORK', '09:00:00', '17:00:00', 8.00, 'QA testing cycle 1'),
  ('te_s03_2', 'ts_seed_03', 'prj_002', 'TUESDAY',   'WORK', '09:00:00', '17:30:00', 8.50, 'Regression testing'),
  ('te_s03_3', 'ts_seed_03', 'prj_001', 'WEDNESDAY', 'WORK', '09:00:00', '17:00:00', 8.00, 'Integration test review'),
  ('te_s03_4', 'ts_seed_03', 'prj_002', 'THURSDAY',  'WORK', '09:00:00', '17:00:00', 8.00, 'Test case documentation');

-- Timesheet 4: Sarah Manager, week 2026-03-09 (SUBMITTED)
INSERT IGNORE INTO time_entries (id, timesheet_id, project_id, day_of_week, entry_type, start_time, end_time, hours_logged, description) VALUES
  ('te_s04_1', 'ts_seed_04', 'prj_001', 'MONDAY',    'WORK', '09:00:00', '17:00:00', 8.00, 'Team standup & sprint review'),
  ('te_s04_2', 'ts_seed_04', 'prj_001', 'TUESDAY',   'WORK', '09:00:00', '18:00:00', 9.00, 'Stakeholder meeting & planning'),
  ('te_s04_3', 'ts_seed_04', 'prj_002', 'WEDNESDAY', 'WORK', '09:00:00', '17:00:00', 8.00, 'Project Beta coordination');

-- Timesheet 5: John Developer, week 2026-03-09 (DRAFT)
INSERT IGNORE INTO time_entries (id, timesheet_id, project_id, day_of_week, entry_type, start_time, end_time, hours_logged, description) VALUES
  ('te_s05_1', 'ts_seed_05', 'prj_001', 'MONDAY',    'WORK', '09:00:00', '17:00:00', 8.00, 'New feature kickoff'),
  ('te_s05_2', 'ts_seed_05', 'prj_001', 'TUESDAY',   'WORK', '09:00:00', '17:00:00', 8.00, 'Implementation in progress');
