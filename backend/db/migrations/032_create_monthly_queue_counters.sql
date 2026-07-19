-- Migration: 032_create_monthly_queue_counters
-- Description: Replaces per-day queue numbering with per-month numbering.
--   The reference number sequence (e.g. 0012) resets to 0001 on the first
--   intake of each calendar month (Manila local time).
--   Keyed by the first day of the month so the same atomic UPSERT pattern
--   used by daily_queue_counters applies here.

BEGIN;

CREATE TABLE monthly_queue_counters (
  queue_month DATE PRIMARY KEY,   -- always the 1st of the month in Manila time
  last_number INTEGER NOT NULL DEFAULT 0
);

COMMIT;
