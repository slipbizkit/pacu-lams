-- Migration: 023_restore_email_unique
-- Description: Restore email uniqueness; assign unique placeholder emails before constraining
-- Created: 2026-07-12

BEGIN;

-- Give each user a unique placeholder based on their user_id
UPDATE users SET email = 'user' || user_id || '@pacu.local';

ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);

COMMIT;
