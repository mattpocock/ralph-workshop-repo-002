-- API Keys table
CREATE TABLE api_keys (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  last_used_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Index for user's API keys
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);

-- Index for key lookup during authentication
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
