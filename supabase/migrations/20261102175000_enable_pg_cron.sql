-- M3 schedules drop-expire-matching in the next migration.
-- The extension has to be committed before that job is created.
-- pg_cron installs into pg_catalog.
create extension if not exists pg_cron;
