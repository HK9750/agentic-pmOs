ALTER TABLE users
  ADD COLUMN avatar_url TEXT NOT NULL DEFAULT '',
  ADD COLUMN title TEXT NOT NULL DEFAULT '',
  ADD COLUMN timezone TEXT NOT NULL DEFAULT 'UTC',
  ADD COLUMN bio TEXT NOT NULL DEFAULT '',
  ADD COLUMN profile_completed_at TIMESTAMPTZ,
  ADD COLUMN last_login_at TIMESTAMPTZ;

ALTER TABLE user_sessions
  ADD COLUMN revoked_reason TEXT NOT NULL DEFAULT '';

CREATE TABLE auth_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users (id) ON DELETE SET NULL,
  email CITEXT,
  event_type TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  ip_address INET,
  user_agent TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX auth_events_user_created_idx ON auth_events (user_id, created_at DESC);
CREATE INDEX auth_events_email_created_idx ON auth_events (email, created_at DESC);
CREATE INDEX auth_events_type_created_idx ON auth_events (event_type, created_at DESC);
