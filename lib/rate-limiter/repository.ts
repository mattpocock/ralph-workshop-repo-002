import type Database from "better-sqlite3";
import crypto from "crypto";

// Default rate limit configuration
const DEFAULT_RATE_LIMIT_MAX = 100;
const DEFAULT_RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterMs?: number;
}

/**
 * Gets rate limit configuration from environment or defaults
 */
export function getRateLimitConfig(): RateLimitConfig {
  return {
    maxRequests: parseInt(
      process.env.RATE_LIMIT_MAX || String(DEFAULT_RATE_LIMIT_MAX),
      10,
    ),
    windowMs: parseInt(
      process.env.RATE_LIMIT_WINDOW_MS || String(DEFAULT_RATE_LIMIT_WINDOW_MS),
      10,
    ),
  };
}

/**
 * Calculates the start of the current time window
 */
function getWindowStart(windowMs: number, now: Date = new Date()): string {
  const windowStartMs = Math.floor(now.getTime() / windowMs) * windowMs;
  return new Date(windowStartMs).toISOString();
}

/**
 * Checks rate limit for an API key and increments counter if allowed
 * Uses upsert pattern for atomic increment
 */
export function checkRateLimit(
  db: Database.Database,
  apiKeyId: string,
  config: RateLimitConfig = getRateLimitConfig(),
): RateLimitResult {
  const now = new Date();
  const windowStart = getWindowStart(config.windowMs, now);
  const windowStartDate = new Date(windowStart);
  const resetAt = new Date(windowStartDate.getTime() + config.windowMs);

  // Get current count for this window
  const getStmt = db.prepare(`
    SELECT request_count FROM rate_limit_log
    WHERE api_key_id = ? AND window_start = ?
  `);
  const existing = getStmt.get(apiKeyId, windowStart) as
    | { request_count: number }
    | undefined;
  const currentCount = existing?.request_count || 0;

  // Check if limit exceeded
  if (currentCount >= config.maxRequests) {
    const retryAfterMs = resetAt.getTime() - now.getTime();
    return {
      allowed: false,
      remaining: 0,
      resetAt,
      retryAfterMs: Math.max(0, retryAfterMs),
    };
  }

  // Increment counter using upsert
  const upsertStmt = db.prepare(`
    INSERT INTO rate_limit_log (id, api_key_id, window_start, request_count)
    VALUES (?, ?, ?, 1)
    ON CONFLICT(api_key_id, window_start)
    DO UPDATE SET request_count = request_count + 1
  `);
  upsertStmt.run(crypto.randomUUID(), apiKeyId, windowStart);

  return {
    allowed: true,
    remaining: config.maxRequests - currentCount - 1,
    resetAt,
  };
}

/**
 * Gets current rate limit status without incrementing counter
 */
export function getRateLimitStatus(
  db: Database.Database,
  apiKeyId: string,
  config: RateLimitConfig = getRateLimitConfig(),
): { count: number; remaining: number; resetAt: Date } {
  const now = new Date();
  const windowStart = getWindowStart(config.windowMs, now);
  const windowStartDate = new Date(windowStart);
  const resetAt = new Date(windowStartDate.getTime() + config.windowMs);

  const stmt = db.prepare(`
    SELECT request_count FROM rate_limit_log
    WHERE api_key_id = ? AND window_start = ?
  `);
  const existing = stmt.get(apiKeyId, windowStart) as
    | { request_count: number }
    | undefined;
  const count = existing?.request_count || 0;

  return {
    count,
    remaining: Math.max(0, config.maxRequests - count),
    resetAt,
  };
}

/**
 * Cleans up old rate limit entries (entries older than retention period)
 * Called periodically to prevent table from growing indefinitely
 */
export function cleanupOldEntries(
  db: Database.Database,
  retentionMs: number = 3600000, // 1 hour default
): number {
  const cutoff = new Date(Date.now() - retentionMs).toISOString();
  const stmt = db.prepare(`
    DELETE FROM rate_limit_log WHERE window_start < ?
  `);
  const result = stmt.run(cutoff);
  return result.changes;
}
