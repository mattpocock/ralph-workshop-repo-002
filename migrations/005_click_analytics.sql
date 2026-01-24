-- Click analytics table for aggregated click tracking
-- Clicks are aggregated by: link_id + date + country + city + device_type + browser + os + referrer_domain
CREATE TABLE click_analytics (
  id TEXT PRIMARY KEY,
  link_id TEXT NOT NULL,
  date TEXT NOT NULL,
  country TEXT,
  city TEXT,
  device_type TEXT,
  browser TEXT,
  os TEXT,
  referrer_domain TEXT,
  click_count INTEGER NOT NULL DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (link_id) REFERENCES links(id)
);

-- Index for fast lookup by link_id and date (most common query pattern)
CREATE INDEX idx_click_analytics_link_date ON click_analytics(link_id, date);

-- Index for aggregate queries by link
CREATE INDEX idx_click_analytics_link_id ON click_analytics(link_id);

-- Unique constraint to enforce aggregation - only one row per unique combination
CREATE UNIQUE INDEX idx_click_analytics_unique ON click_analytics(
  link_id, date,
  COALESCE(country, ''),
  COALESCE(city, ''),
  COALESCE(device_type, ''),
  COALESCE(browser, ''),
  COALESCE(os, ''),
  COALESCE(referrer_domain, '')
);
