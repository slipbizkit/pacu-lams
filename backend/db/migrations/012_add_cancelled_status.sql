ALTER TYPE client_status ADD VALUE IF NOT EXISTS 'cancelled';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
