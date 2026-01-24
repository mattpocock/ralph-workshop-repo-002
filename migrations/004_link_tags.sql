-- Link-Tags junction table for many-to-many relationship between links and tags
CREATE TABLE link_tags (
  link_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  PRIMARY KEY (link_id, tag_id),
  FOREIGN KEY (link_id) REFERENCES links(id),
  FOREIGN KEY (tag_id) REFERENCES tags(id)
);

-- Index for fast lookup of tags by link
CREATE INDEX idx_link_tags_link_id ON link_tags(link_id);

-- Index for fast lookup of links by tag
CREATE INDEX idx_link_tags_tag_id ON link_tags(tag_id);
