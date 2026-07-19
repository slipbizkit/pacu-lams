-- Migration: 033_add_source_entry
-- Description: Tracks whether a client record was created via the kiosk intake
--   form or entered manually by personnel (e.g. during an internet outage).
--   Existing rows default to 'kiosk'.

BEGIN;

ALTER TABLE clients ADD COLUMN source_entry VARCHAR(10) NOT NULL DEFAULT 'kiosk'
  CHECK (source_entry IN ('kiosk', 'manual'));

COMMIT;
