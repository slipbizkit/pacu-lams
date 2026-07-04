-- Migration: 007_add_concern_to_clients
-- Description: Adds the client's own free-text description of their concern, captured at
--   intake. Distinct from legal_advice (the lawyer's professional advice, Phase 3) and
--   remarks (the lawyer's closing notes) — this column is the client's own words.
-- Created: 2026-07-04

BEGIN;

ALTER TABLE clients ADD COLUMN concern TEXT;

COMMIT;
