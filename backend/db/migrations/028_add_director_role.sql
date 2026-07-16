-- Migration: 028_add_director_role
-- Description: Director of Legal Service — read-only oversight of completed transactions.
-- Created: 2026-07-16

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'director';
