-- Add started_at column to chat_sessions
-- The code in chat_state.ensure_active_session writes started_at on insert.
-- It defaults to now() so existing rows get a sensible value automatically.

ALTER TABLE "public"."chat_sessions"
  ADD COLUMN IF NOT EXISTS "started_at" timestamptz DEFAULT now();

-- Backfill: set started_at = created_at for existing rows where it is null
UPDATE "public"."chat_sessions"
  SET "started_at" = "created_at"
  WHERE "started_at" IS NULL;
