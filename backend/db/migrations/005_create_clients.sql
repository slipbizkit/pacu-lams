-- Migration: 005_create_clients
-- Description: One row per legal assistance transaction. Clients do not authenticate.
-- Created: 2026-07-03

BEGIN;

CREATE TYPE client_status AS ENUM ('waiting', 'assigned', 'in_progress', 'completed');
CREATE TYPE client_sex AS ENUM ('male', 'female');
CREATE TYPE civil_status_type AS ENUM ('single', 'married', 'widowed', 'separated', 'divorced');

CREATE TABLE clients (
  client_id          SERIAL PRIMARY KEY,
  reference_no        VARCHAR(50) UNIQUE NOT NULL,
  queue_number        INTEGER NOT NULL,
  transaction_date    DATE NOT NULL DEFAULT CURRENT_DATE,

  first_name          VARCHAR(100) NOT NULL,
  middle_name         VARCHAR(100),
  last_name           VARCHAR(100) NOT NULL,
  suffix              VARCHAR(20),
  sex                 client_sex,
  birth_date           DATE,
  civil_status         civil_status_type,

  contact_no          VARCHAR(30),
  email                VARCHAR(255),

  address              TEXT,
  city                 VARCHAR(100),
  province             VARCHAR(100),

  occupation           VARCHAR(150),
  employer             VARCHAR(200),

  is_pwd               BOOLEAN NOT NULL DEFAULT FALSE,
  is_senior            BOOLEAN NOT NULL DEFAULT FALSE,
  is_pregnant          BOOLEAN NOT NULL DEFAULT FALSE,

  assigned_lawyer_id   INTEGER REFERENCES users(user_id) ON DELETE SET NULL,

  legal_advice         TEXT,
  referred_office_id   INTEGER REFERENCES referred_offices(office_id) ON DELETE SET NULL,
  referred_reason      TEXT,

  feedback_rating      SMALLINT CHECK (feedback_rating BETWEEN 1 AND 5),
  feedback_comments    TEXT,

  status               client_status NOT NULL DEFAULT 'waiting',

  encoded_by           INTEGER REFERENCES users(user_id) ON DELETE SET NULL,

  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_clients_queue_per_day UNIQUE (transaction_date, queue_number),
  CONSTRAINT chk_clients_referral_pair CHECK (
    (referred_office_id IS NULL AND referred_reason IS NULL) OR
    (referred_office_id IS NOT NULL AND referred_reason IS NOT NULL)
  ),
  CONSTRAINT chk_clients_completed_requires_advice CHECK (
    status <> 'completed' OR legal_advice IS NOT NULL
  )
);

CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_assigned_lawyer ON clients(assigned_lawyer_id);
CREATE INDEX idx_clients_transaction_date ON clients(transaction_date);
CREATE INDEX idx_clients_priority ON clients(is_senior, is_pwd, is_pregnant) WHERE status = 'waiting';
CREATE INDEX idx_clients_referred_office ON clients(referred_office_id);

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
