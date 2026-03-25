-- =============================================================================
-- TimeKeeper – UTF-8 (utf8mb4) Database Migration
-- =============================================================================
-- PURPOSE
--   Permanently migrate the timekeeper_db database and all its tables/columns
--   to the utf8mb4 character set with the utf8mb4_unicode_ci collation.
--
--   utf8mb4 is MySQL's true 4-byte UTF-8 superset.  The older "utf8" (alias
--   utf8mb3) only stores 3-byte code points and silently drops 4-byte
--   characters (emojis, some CJK) replacing them with the U+FFFD replacement
--   character (·).
--
-- WHEN TO RUN
--   Execute this script ONCE, manually, against a running MySQL server, BEFORE
--   or AFTER starting the application.  Hibernate's ddl-auto=update will keep
--   the schema in sync afterward because the JDBC URL now includes
--   connectionCollation=utf8mb4_unicode_ci, which tells MySQL Connector/J to
--   negotiate utf8mb4 on every new connection.
--
-- SAFETY
--   ALTER TABLE ... CONVERT TO ... is an in-place DDL operation that rewrites
--   every row.  Schedule during low-traffic periods for production databases.
--   For development the script is safe to run at any time.
-- =============================================================================

USE timekeeper_db;

-- ── 1. Set connection charset for this session ────────────────────────────────
SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci;

-- ── 2. Convert the database default charset / collation ──────────────────────
ALTER DATABASE timekeeper_db
    CHARACTER SET = utf8mb4
    COLLATE      = utf8mb4_unicode_ci;

-- ── 3. Convert every table to utf8mb4 ────────────────────────────────────────
--   This rewrites each table AND converts all text-based columns (CHAR,
--   VARCHAR, TEXT, …) to utf8mb4_unicode_ci in one pass.

ALTER TABLE departments       CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE employees         CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE projects          CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE timesheets        CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE time_entries      CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE leave_requests    CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE notifications     CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- NOTE: If Hibernate's ddl-auto has created additional tables that are not
-- listed here, you can run the following SQL to generate ALTER statements for
-- all remaining utf8mb3 tables automatically:
--
--   SELECT CONCAT(
--       'ALTER TABLE `', TABLE_NAME, '` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'
--   ) AS migration_sql
--   FROM information_schema.TABLES
--   WHERE TABLE_SCHEMA = 'timekeeper_db'
--     AND (TABLE_COLLATION LIKE 'utf8_%' AND TABLE_COLLATION NOT LIKE 'utf8mb4_%');

-- ── 4. Verify ─────────────────────────────────────────────────────────────────
-- Run this SELECT after the migration to confirm every table is on utf8mb4:
--
--   SELECT TABLE_NAME, TABLE_COLLATION
--   FROM   information_schema.TABLES
--   WHERE  TABLE_SCHEMA = 'timekeeper_db'
--   ORDER  BY TABLE_NAME;
