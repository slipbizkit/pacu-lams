-- Single-session enforcement: track one active JWT per user.
-- Each login atomically replaces the previous session, kicking any other device.
CREATE TABLE IF NOT EXISTS user_sessions (
  session_id SERIAL       PRIMARY KEY,
  user_id    INT          NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  jti        UUID         NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ  NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_jti     ON user_sessions(jti);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
