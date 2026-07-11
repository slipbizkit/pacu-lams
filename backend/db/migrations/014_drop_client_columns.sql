-- Migration: 014_drop_client_columns
-- Description: Remove unused columns from clients table:
--   birth_date, civil_status, address, action_taken (if exists), encoded_by.
--   Also drops the civil_status_type enum.
-- Created: 2026-07-10

BEGIN;

ALTER TABLE clients
  DROP COLUMN IF EXISTS birth_date,
  DROP COLUMN IF EXISTS civil_status,
  DROP COLUMN IF EXISTS address,
  DROP COLUMN IF EXISTS action_taken,
  DROP COLUMN IF EXISTS encoded_by;

DROP TYPE IF EXISTS civil_status_type;

COMMIT;
