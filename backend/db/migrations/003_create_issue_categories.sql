-- Migration: 003_create_issue_categories
-- Description: Master table of tag-able legal issue categories, grouped for display.
--   'Others' group allows free-text via client_issues.issue_description.
-- Created: 2026-07-03

BEGIN;

CREATE TABLE issue_categories (
  category_id    SERIAL PRIMARY KEY,
  category_group VARCHAR(100) NOT NULL,
  category_name  VARCHAR(150) NOT NULL,
  description    TEXT,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_issue_categories_group ON issue_categories(category_group);
CREATE INDEX idx_issue_categories_active ON issue_categories(is_active) WHERE is_active = TRUE;

CREATE TRIGGER update_issue_categories_updated_at
  BEFORE UPDATE ON issue_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO issue_categories (category_group, category_name) VALUES
  ('Wages', 'Delay'),
  ('Wages', 'Deduction'),
  ('Wages', 'Diminution of Benefits'),
  ('Wages', 'Withholding of Wage'),
  ('Social Welfare Benefits', 'SSS'),
  ('Social Welfare Benefits', 'PhilHealth'),
  ('Social Welfare Benefits', 'HDMF / Pag-IBIG'),
  ('Social Welfare Benefits', 'Retirement Pay'),
  ('Leave Benefits', 'Service Incentive Leave (SIL)'),
  ('Leave Benefits', 'Maternity Leave'),
  ('Leave Benefits', 'Paternity Leave'),
  ('Leave Benefits', 'VAWC'),
  ('Leave Benefits', 'Magna Carta of Women'),
  ('Kinds of Employment', 'Regular'),
  ('Kinds of Employment', 'Probationary'),
  ('Kinds of Employment', 'Project'),
  ('Kinds of Employment', 'Contractual'),
  ('Kinds of Employment', 'Seasonal'),
  ('Termination of Employment', 'Resignation'),
  ('Termination of Employment', 'Illegal Termination'),
  ('Termination of Employment', 'Constructive Dismissal'),
  ('Management Prerogative', 'Company Rules'),
  ('Management Prerogative', 'Discipline'),
  ('Management Prerogative', 'Work Supervision'),
  ('Conditions of Employment', 'Working Hours'),
  ('Conditions of Employment', 'Rest Day'),
  ('Conditions of Employment', 'Occupational Safety and Health (OSH)'),
  ('Others', 'Others');

COMMIT;
