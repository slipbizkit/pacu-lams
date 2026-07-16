-- General key-value settings table. Initially used to store the kiosk password hash.
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT         PRIMARY KEY,
  value      TEXT         NOT NULL,
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);
