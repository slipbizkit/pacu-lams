ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'support_staff';
ALTER TABLE clients ADD COLUMN IF NOT EXISTS removed_by INTEGER REFERENCES users(user_id);
