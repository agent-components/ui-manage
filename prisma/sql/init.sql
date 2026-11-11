CREATE SCHEMA IF NOT EXISTS ui_manage;

CREATE TABLE IF NOT EXISTS ui_manage.designs (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  owner_account text NOT NULL,
  object_key text NOT NULL UNIQUE,
  byte_size integer,
  share_token text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS designs_owner_account_idx
  ON ui_manage.designs (owner_account);

ALTER TABLE ui_manage.designs
  ADD COLUMN IF NOT EXISTS share_token text;

CREATE UNIQUE INDEX IF NOT EXISTS designs_share_token_key
  ON ui_manage.designs (share_token);

CREATE TABLE IF NOT EXISTS ui_manage.api_tokens (
  id uuid PRIMARY KEY,
  owner_account text NOT NULL,
  name text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  token_prefix text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS api_tokens_owner_account_idx
  ON ui_manage.api_tokens (owner_account);
