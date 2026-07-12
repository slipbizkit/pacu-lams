-- Migration: 022_allow_duplicate_emails
-- Description: Drop email uniqueness constraint for development; set all users to shared email
-- Created: 2026-07-12

BEGIN;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_unique;

UPDATE users SET email = 'thomas.ruivivar@live.com';

COMMIT;
