-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Seed dummy user for Phase 1 (auth deferred)
INSERT INTO users (id, email, name) VALUES ('user_1', 'dummy@example.com', 'Dummy User');
