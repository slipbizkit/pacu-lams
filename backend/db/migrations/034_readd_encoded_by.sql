-- Migration: 034_readd_encoded_by
-- Description: Re-adds encoded_by to clients (dropped in 014 as unused).
--   Now needed to track which personnel user manually entered an offline client.
-- Created: 2026-07-20

BEGIN;

ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS encoded_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL;

COMMIT;
