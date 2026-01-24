-- Rate limit log table for tracking API requests per time window
CREATE TABLE rate_limit_log (
  id TEXT PRIMARY KEY,
  api_key_id TEXT NOT NULL,
  window_start TEXT NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY (api_key_id) REFERENCES api_keys(id) ON DELETE CASCADE
);

-- Index for efficient lookup during rate limit checks
CREATE UNIQUE INDEX idx_rate_limit_log_key_window ON rate_limit_log(api_key_id, window_start);
