-- Migration: 010_clients_city_references
-- Description: Replaces the free-text city/company_city/province columns on `clients`
--   with FK references into `cities_municipalities`, so province/region are derived by
--   relationship instead of duplicated as text. Existing rows are backfilled by exact
--   (case-insensitive) name match against the new reference table before the old
--   text columns are dropped; unmatched values are left NULL.
-- Created: 2026-07-05

BEGIN;

ALTER TABLE clients
  ADD COLUMN city_id INTEGER REFERENCES cities_municipalities(id) ON DELETE SET NULL,
  ADD COLUMN company_city_id INTEGER REFERENCES cities_municipalities(id) ON DELETE SET NULL;

UPDATE clients c
SET city_id = cm.id
FROM cities_municipalities cm
WHERE c.city IS NOT NULL AND LOWER(TRIM(c.city)) = LOWER(cm.city_municipality);

UPDATE clients c
SET company_city_id = cm.id
FROM cities_municipalities cm
WHERE c.company_city IS NOT NULL AND LOWER(TRIM(c.company_city)) = LOWER(cm.city_municipality);

ALTER TABLE clients
  DROP COLUMN city,
  DROP COLUMN company_city,
  DROP COLUMN province;

CREATE INDEX idx_clients_city_id ON clients(city_id);
CREATE INDEX idx_clients_company_city_id ON clients(company_city_id);

COMMIT;
