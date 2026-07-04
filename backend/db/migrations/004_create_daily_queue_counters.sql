-- Migration: 004_create_daily_queue_counters
-- Description: Backs sequential-per-day queue numbering. One row per local calendar day;
--   next number is claimed via an atomic UPSERT + increment (see queueService).
-- Created: 2026-07-03

BEGIN;

CREATE TABLE daily_queue_counters (
  queue_date  DATE PRIMARY KEY,
  last_number INTEGER NOT NULL DEFAULT 0
);

COMMIT;
