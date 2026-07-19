-- Migration: 035_add_completed_at
-- Description: Adds completed_at timestamp set once when status → 'completed'.
--   Prevents updated_at (bumped by every UPDATE, including email sends) from
--   being misread as the completion date.
-- Created: 2026-07-20

BEGIN;

ALTER TABLE clients ADD COLUMN completed_at TIMESTAMPTZ;

UPDATE clients SET completed_at = updated_at WHERE status = 'completed';

COMMIT;
