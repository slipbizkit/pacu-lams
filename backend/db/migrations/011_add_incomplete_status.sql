-- Add 'incomplete' to the client_status enum.
-- Enum values cannot be removed once added, so this is a forward-only migration.
ALTER TYPE client_status ADD VALUE IF NOT EXISTS 'incomplete';
