-- Migration: 002_create_referred_offices
-- Description: Master table of offices clients can be referred to. Admin-configurable.
-- Created: 2026-07-03

BEGIN;

CREATE TABLE referred_offices (
  office_id   SERIAL PRIMARY KEY,
  office_name VARCHAR(200) NOT NULL,
  office_type VARCHAR(100),
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_referred_offices_active ON referred_offices(is_active) WHERE is_active = TRUE;

CREATE TRIGGER update_referred_offices_updated_at
  BEFORE UPDATE ON referred_offices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
