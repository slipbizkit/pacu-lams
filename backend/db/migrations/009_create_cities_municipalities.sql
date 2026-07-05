-- Migration: 009_create_cities_municipalities
-- Description: Normalized reference table of Philippine cities/municipalities, sourced
--   from the PSA's Philippine Standard Geographic Code (PSGC). Backs the intake form's
--   City/Municipality dropdown and lets province/region be derived by relationship
--   instead of duplicated as free text. Populated separately by scripts/seedPsgc.ts —
--   this migration only creates the table.
-- Created: 2026-07-05

BEGIN;

CREATE TABLE cities_municipalities (
  id                 SERIAL PRIMARY KEY,
  psgc_code          VARCHAR(10) UNIQUE NOT NULL,
  city_municipality  VARCHAR(150) NOT NULL,
  province           VARCHAR(150) NOT NULL,
  region             VARCHAR(150) NOT NULL,
  is_city            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cities_municipalities_name ON cities_municipalities (city_municipality);
CREATE INDEX idx_cities_municipalities_province ON cities_municipalities (province);
CREATE INDEX idx_cities_municipalities_region ON cities_municipalities (region);

CREATE TRIGGER update_cities_municipalities_updated_at
  BEFORE UPDATE ON cities_municipalities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMIT;
