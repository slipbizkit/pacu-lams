-- Migration: 008_extend_clients_intake
-- Description: Adds fields captured by the revamped multi-step intake wizard:
--   employment dates/union status, and the client's company (name reuses the
--   existing `employer` column; work position reuses `occupation`).
-- Created: 2026-07-05

BEGIN;

ALTER TABLE clients
  ADD COLUMN date_of_employment DATE,
  ADD COLUMN union_member BOOLEAN,
  ADD COLUMN company_city VARCHAR(100),
  ADD COLUMN pending_complaint_types TEXT[];

COMMIT;
