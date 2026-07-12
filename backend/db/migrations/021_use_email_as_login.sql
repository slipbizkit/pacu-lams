-- Migration: 021_use_email_as_login
-- Description: Replace username with email as the login identifier
-- Created: 2026-07-12

BEGIN;

-- Give existing users a placeholder email derived from their username
-- so they can still log in after this migration. Update to real emails immediately.
UPDATE users SET email = username || '@pacu.local' WHERE email IS NULL;

-- Enforce uniqueness on email (login identifier)
ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);

-- Remove username — email is now the login identifier
DROP INDEX IF EXISTS idx_users_username;
ALTER TABLE users DROP COLUMN IF EXISTS username;

COMMIT;
