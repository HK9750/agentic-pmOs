DROP TABLE IF EXISTS auth_events;

ALTER TABLE user_sessions
  DROP COLUMN IF EXISTS revoked_reason;

ALTER TABLE users
  DROP COLUMN IF EXISTS last_login_at,
  DROP COLUMN IF EXISTS profile_completed_at,
  DROP COLUMN IF EXISTS bio,
  DROP COLUMN IF EXISTS timezone,
  DROP COLUMN IF EXISTS title,
  DROP COLUMN IF EXISTS avatar_url;
