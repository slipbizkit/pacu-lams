-- Migration: 024_add_must_change_password
-- Description: Flag forcing a password change on next login (admin-triggered reset)
-- Created: 2026-07-12

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

COMMIT;
