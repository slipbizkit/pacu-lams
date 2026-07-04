-- Migration: 006_create_client_issues
-- Description: Many-to-many tagging of a client transaction to one or more issue categories.
-- Created: 2026-07-03

BEGIN;

CREATE TABLE client_issues (
  client_issue_id   SERIAL PRIMARY KEY,
  client_id         INTEGER NOT NULL REFERENCES clients(client_id) ON DELETE CASCADE,
  category_id       INTEGER NOT NULL REFERENCES issue_categories(category_id),
  issue_description TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_client_issues_client_category UNIQUE (client_id, category_id)
);

CREATE INDEX idx_client_issues_client_id ON client_issues(client_id);
CREATE INDEX idx_client_issues_category_id ON client_issues(category_id);

COMMIT;
