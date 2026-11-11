-- Existing DBs: add share_token for read-only share links.
ALTER TABLE ui_manage.designs
  ADD COLUMN IF NOT EXISTS share_token text;

CREATE UNIQUE INDEX IF NOT EXISTS designs_share_token_key
  ON ui_manage.designs (share_token);
