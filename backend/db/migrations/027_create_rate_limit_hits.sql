-- Migration: 027_create_rate_limit_hits
-- Description: Persistent counter store for express-rate-limit. The default in-memory
--   store does not survive Vercel cold starts and is not shared across concurrent
--   lambda instances, making brute-force protection unreliable in production.
--   One row per rate-limit key; rows expire and are swept via expires_at.
--   Intentionally lean (no updated_at / trigger) — this table is on a hot path.
-- Created: 2026-07-15

BEGIN;

CREATE TABLE rate_limit_hits (
  key        TEXT PRIMARY KEY,
  hits       INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL
);

-- Supports sweeping expired rows (DELETE ... WHERE expires_at < NOW()).
CREATE INDEX idx_rate_limit_hits_expires ON rate_limit_hits(expires_at);

COMMIT;
