-- Tags table
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, name)
);

-- Index for user's tags
CREATE INDEX idx_tags_user_id ON tags(user_id);
