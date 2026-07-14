-- Migration: 025_create_client_feedback
-- Description: Client Satisfaction Measurement (CSM) survey — 10 SQD statements
--   rated 1-5 per completed transaction, one response per transaction. Replaces the
--   old single overall star rating on the clients table.
-- Created: 2026-07-13

BEGIN;

CREATE TABLE client_feedback (
  feedback_id    SERIAL PRIMARY KEY,
  client_id      INTEGER NOT NULL UNIQUE REFERENCES clients(client_id) ON DELETE CASCADE,

  sqd1  SMALLINT NOT NULL CHECK (sqd1  BETWEEN 1 AND 5),
  sqd2  SMALLINT NOT NULL CHECK (sqd2  BETWEEN 1 AND 5),
  sqd3  SMALLINT NOT NULL CHECK (sqd3  BETWEEN 1 AND 5),
  sqd4  SMALLINT NOT NULL CHECK (sqd4  BETWEEN 1 AND 5),
  sqd5  SMALLINT NOT NULL CHECK (sqd5  BETWEEN 1 AND 5),
  sqd6  SMALLINT          CHECK (sqd6  BETWEEN 1 AND 5),   -- NULL = Not Applicable
  sqd7  SMALLINT NOT NULL CHECK (sqd7  BETWEEN 1 AND 5),
  sqd8  SMALLINT NOT NULL CHECK (sqd8  BETWEEN 1 AND 5),
  sqd9  SMALLINT NOT NULL CHECK (sqd9  BETWEEN 1 AND 5),
  sqd10 SMALLINT NOT NULL CHECK (sqd10 BETWEEN 1 AND 5),

  comments       TEXT,
  submitted_via  VARCHAR(10) NOT NULL DEFAULT 'online' CHECK (submitted_via IN ('online', 'manual')),
  encoded_by     INTEGER REFERENCES users(user_id) ON DELETE SET NULL,  -- set only when manually encoded
  submitted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Retire the old single-star overall rating; superseded by the CSM survey above.
ALTER TABLE clients DROP COLUMN feedback_rating;
ALTER TABLE clients DROP COLUMN feedback_comments;

COMMIT;
