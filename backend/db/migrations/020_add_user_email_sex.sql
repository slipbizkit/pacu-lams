-- Migration: 020_add_user_email_sex
-- Description: Add email and sex columns to users table
-- Created: 2026-07-12

BEGIN;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email VARCHAR(255) NULL,
  ADD COLUMN IF NOT EXISTS sex   VARCHAR(10)  NULL CHECK (sex IN ('male', 'female'));

COMMIT;
