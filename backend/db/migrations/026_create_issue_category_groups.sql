-- Migration: 026_create_issue_category_groups
-- Description: Promote the free-text issue_categories.category_group column to a
--   first-class issue_category_groups table, so an admin can create an empty
--   category group and add individual issues to it later.
-- Created: 2026-07-15

BEGIN;

CREATE TABLE issue_category_groups (
  group_id   SERIAL PRIMARY KEY,
  group_name VARCHAR(100) NOT NULL UNIQUE,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_issue_category_groups_updated_at
  BEFORE UPDATE ON issue_category_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Backfill the groups from the existing free-text column.
INSERT INTO issue_category_groups (group_name)
SELECT DISTINCT category_group FROM issue_categories;

-- Link issue_categories to its group.
ALTER TABLE issue_categories
  ADD COLUMN group_id INTEGER REFERENCES issue_category_groups(group_id) ON DELETE RESTRICT;

UPDATE issue_categories ic
SET group_id = g.group_id
FROM issue_category_groups g
WHERE g.group_name = ic.category_group;

ALTER TABLE issue_categories ALTER COLUMN group_id SET NOT NULL;

-- Retire the free-text column and its index.
DROP INDEX IF EXISTS idx_issue_categories_group;
ALTER TABLE issue_categories DROP COLUMN category_group;

CREATE INDEX idx_issue_categories_group_id ON issue_categories(group_id);

COMMIT;
