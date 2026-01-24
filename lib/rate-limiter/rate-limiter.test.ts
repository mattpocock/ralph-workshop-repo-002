import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import Database from "better-sqlite3";
import { getTestDb, runMigrations } from "../db";
import { createApiKey } from "../api-keys";
import {
  checkRateLimit,
  getRateLimitStatus,
  cleanupOldEntries,
  type RateLimitConfig,
} from "./index";

describe("rate-limiter", () => {
  let testDb: Database.Database;
  let apiKeyId: string;

  // Test config with low limits for easier testing
  const testConfig: RateLimitConfig = {
    maxRequests: 5,
    windowMs: 60000, // 1 minute
  };

  beforeEach(() => {
    testDb = getTestDb();
    runMigrations(testDb);

    // Create an API key for testing
    const { apiKey } = createApiKey(testDb, {
      userId: "user_1",
      name: "Test API Key",
    });
    apiKeyId = apiKey.id;
  });

  afterEach(() => {
    testDb.close();
    vi.useRealTimers();
  });

  describe("checkRateLimit", () => {
    it("allows requests under the limit", () => {
      const result = checkRateLimit(testDb, apiKeyId, testConfig);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.resetAt).toBeInstanceOf(Date);
      expect(result.retryAfterMs).toBeUndefined();
    });

    it("tracks request count correctly", () => {
      // Make 3 requests
      checkRateLimit(testDb, apiKeyId, testConfig);
      checkRateLimit(testDb, apiKeyId, testConfig);
      const result = checkRateLimit(testDb, apiKeyId, testConfig);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);
    });

    it("blocks requests when limit is exceeded", () => {
      // Exhaust the limit
      for (let i = 0; i < testConfig.maxRequests; i++) {
        checkRateLimit(testDb, apiKeyId, testConfig);
      }

      // Next request should be blocked
      const result = checkRateLimit(testDb, apiKeyId, testConfig);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfterMs).toBeDefined();
      expect(result.retryAfterMs).toBeGreaterThan(0);
    });

    it("resets after window expires", () => {
      vi.useFakeTimers();
      const startTime = new Date("2024-01-01T12:00:00Z");
      vi.setSystemTime(startTime);

      // Exhaust the limit
      for (let i = 0; i < testConfig.maxRequests; i++) {
        checkRateLimit(testDb, apiKeyId, testConfig);
      }

      // Should be blocked
      expect(checkRateLimit(testDb, apiKeyId, testConfig).allowed).toBe(false);

      // Move time forward past the window
      vi.setSystemTime(new Date(startTime.getTime() + testConfig.windowMs + 1));

      // Should be allowed again
      const result = checkRateLimit(testDb, apiKeyId, testConfig);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it("tracks separate windows correctly", () => {
      vi.useFakeTimers();
      const startTime = new Date("2024-01-01T12:00:00Z");
      vi.setSystemTime(startTime);

      // Make 3 requests in first window
      checkRateLimit(testDb, apiKeyId, testConfig);
      checkRateLimit(testDb, apiKeyId, testConfig);
      checkRateLimit(testDb, apiKeyId, testConfig);

      // Move to next window
      vi.setSystemTime(new Date(startTime.getTime() + testConfig.windowMs + 1));

      // New window should start fresh
      const result = checkRateLimit(testDb, apiKeyId, testConfig);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    it("handles concurrent requests correctly", () => {
      // Simulate concurrent requests by making multiple calls
      const results = Array.from({ length: 10 }, () =>
        checkRateLimit(testDb, apiKeyId, testConfig),
      );

      // First 5 should be allowed
      const allowedCount = results.filter((r) => r.allowed).length;
      expect(allowedCount).toBe(5);

      // Last 5 should be blocked
      const blockedCount = results.filter((r) => !r.allowed).length;
      expect(blockedCount).toBe(5);
    });

    it("tracks different API keys separately", () => {
      // Create a second API key
      testDb
        .prepare("INSERT INTO users (id, email, name) VALUES (?, ?, ?)")
        .run("user_2", "test2@example.com", "Test User 2");
      const { apiKey: secondKey } = createApiKey(testDb, {
        userId: "user_2",
        name: "Second API Key",
      });

      // Exhaust limit for first key
      for (let i = 0; i < testConfig.maxRequests; i++) {
        checkRateLimit(testDb, apiKeyId, testConfig);
      }

      // First key should be blocked
      expect(checkRateLimit(testDb, apiKeyId, testConfig).allowed).toBe(false);

      // Second key should still have full limit
      const result = checkRateLimit(testDb, secondKey.id, testConfig);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });
  });

  describe("getRateLimitStatus", () => {
    it("returns current status without incrementing", () => {
      // Make some requests
      checkRateLimit(testDb, apiKeyId, testConfig);
      checkRateLimit(testDb, apiKeyId, testConfig);

      // Get status
      const status = getRateLimitStatus(testDb, apiKeyId, testConfig);
      expect(status.count).toBe(2);
      expect(status.remaining).toBe(3);

      // Getting status again should not change count
      const status2 = getRateLimitStatus(testDb, apiKeyId, testConfig);
      expect(status2.count).toBe(2);
    });

    it("returns zero count for new API key", () => {
      const status = getRateLimitStatus(testDb, apiKeyId, testConfig);

      expect(status.count).toBe(0);
      expect(status.remaining).toBe(5);
    });
  });

  describe("cleanupOldEntries", () => {
    it("removes entries older than retention period", () => {
      vi.useFakeTimers();
      const now = new Date("2024-01-01T12:00:00Z");
      vi.setSystemTime(now);

      // Create an old entry
      testDb
        .prepare(
          `INSERT INTO rate_limit_log (id, api_key_id, window_start, request_count)
         VALUES (?, ?, ?, ?)`,
        )
        .run(
          "old-entry",
          apiKeyId,
          new Date("2024-01-01T10:00:00Z").toISOString(),
          5,
        );

      // Create a recent entry
      checkRateLimit(testDb, apiKeyId, testConfig);

      // Cleanup with 1 hour retention
      const deleted = cleanupOldEntries(testDb, 3600000);

      expect(deleted).toBe(1);

      // Recent entry should still exist
      const remaining = testDb
        .prepare("SELECT COUNT(*) as count FROM rate_limit_log")
        .get() as { count: number };
      expect(remaining.count).toBe(1);
    });

    it("returns count of deleted entries", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2024-01-01T12:00:00Z"));

      // Create multiple old entries
      testDb
        .prepare(
          `INSERT INTO rate_limit_log (id, api_key_id, window_start, request_count)
         VALUES (?, ?, ?, ?)`,
        )
        .run(
          "old-1",
          apiKeyId,
          new Date("2024-01-01T10:00:00Z").toISOString(),
          1,
        );
      testDb
        .prepare(
          `INSERT INTO rate_limit_log (id, api_key_id, window_start, request_count)
         VALUES (?, ?, ?, ?)`,
        )
        .run(
          "old-2",
          apiKeyId,
          new Date("2024-01-01T09:00:00Z").toISOString(),
          1,
        );

      const deleted = cleanupOldEntries(testDb, 3600000);
      expect(deleted).toBe(2);
    });
  });
});
