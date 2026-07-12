-- Seed standard DOLE referral offices
INSERT INTO referred_offices (office_name, office_type, is_active) VALUES
  ('NLRC', 'Government Agency', TRUE),
  ('NCMB', 'Government Agency', TRUE),
  ('DMW', 'Government Agency', TRUE),
  ('OWWA', 'Government Agency', TRUE),
  ('DOLE Regional/Field Office', 'DOLE Office', TRUE)
ON CONFLICT DO NOTHING;
