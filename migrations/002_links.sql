-- Links table
CREATE TABLE links (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  destination_url TEXT NOT NULL,
  expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  deleted_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Index for fast slug lookups
CREATE INDEX idx_links_slug ON links(slug);

-- Index for user's links
CREATE INDEX idx_links_user_id ON links(user_id);
