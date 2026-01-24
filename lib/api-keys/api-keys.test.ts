import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { getTestDb, runMigrations } from "../db";
import {
  createApiKey,
  getApiKeyById,
  getApiKeys,
  validateApiKey,
  deleteApiKey,
} from "./index";

describe("api-keys repository", () => {
  let testDb: Database.Database;

  beforeEach(() => {
    testDb = getTestDb();
    runMigrations(testDb);
  });

  afterEach(() => {
    testDb.close();
  });

  describe("createApiKey", () => {
    it("creates an API key and returns plain key", () => {
      const result = createApiKey(testDb, {
        userId: "user_1",
        name: "My API Key",
      });

      expect(result.apiKey.id).toBeDefined();
      expect(result.apiKey.name).toBe("My API Key");
      expect(result.apiKey.user_id).toBe("user_1");
      expect(result.apiKey.created_at).toBeDefined();
      expect(result.apiKey.last_used_at).toBeNull();
      expect(result.plainKey).toMatch(/^rlk_[a-f0-9]{32}$/);
    });

    it("stores hashed key, not plain key", () => {
      const result = createApiKey(testDb, {
        userId: "user_1",
        name: "My API Key",
      });

      // The stored key_hash should NOT equal the plain key
      expect(result.apiKey.key_hash).not.toBe(result.plainKey);
      // The key_hash should be a SHA-256 hex string (64 chars)
      expect(result.apiKey.key_hash).toMatch(/^[a-f0-9]{64}$/);
    });

    it("generates unique keys for each creation", () => {
      const result1 = createApiKey(testDb, {
        userId: "user_1",
        name: "Key 1",
      });
      const result2 = createApiKey(testDb, {
        userId: "user_1",
        name: "Key 2",
      });

      expect(result1.plainKey).not.toBe(result2.plainKey);
      expect(result1.apiKey.id).not.toBe(result2.apiKey.id);
    });
  });

  describe("getApiKeyById", () => {
    it("returns API key by id", () => {
      const { apiKey: created } = createApiKey(testDb, {
        userId: "user_1",
        name: "My API Key",
      });

      const found = getApiKeyById(testDb, created.id);
      expect(found?.name).toBe("My API Key");
    });

    it("returns undefined for non-existent id", () => {
      const found = getApiKeyById(testDb, "nonexistent");
      expect(found).toBeUndefined();
    });
  });

  describe("getApiKeys", () => {
    it("returns empty array for user with no API keys", () => {
      const apiKeys = getApiKeys(testDb, "user_1");
      expect(apiKeys).toEqual([]);
    });

    it("returns all API keys for user ordered by created_at descending", () => {
      // Insert keys with explicit timestamps
      testDb
        .prepare(
          `INSERT INTO api_keys (id, user_id, key_hash, name, created_at) VALUES (?, ?, ?, ?, ?)`,
        )
        .run("id1", "user_1", "hash1", "First Key", "2024-01-01T00:00:00Z");
      testDb
        .prepare(
          `INSERT INTO api_keys (id, user_id, key_hash, name, created_at) VALUES (?, ?, ?, ?, ?)`,
        )
        .run("id2", "user_1", "hash2", "Second Key", "2024-01-02T00:00:00Z");

      const apiKeys = getApiKeys(testDb, "user_1");
      expect(apiKeys).toHaveLength(2);
      expect(apiKeys[0].name).toBe("Second Key");
      expect(apiKeys[1].name).toBe("First Key");
    });

    it("only returns API keys for specified user", () => {
      // Insert another user for testing
      testDb
        .prepare("INSERT INTO users (id, email, name) VALUES (?, ?, ?)")
        .run("user_2", "test2@example.com", "Test User 2");

      createApiKey(testDb, { userId: "user_1", name: "User 1 Key" });
      createApiKey(testDb, { userId: "user_2", name: "User 2 Key" });

      const apiKeys = getApiKeys(testDb, "user_1");
      expect(apiKeys).toHaveLength(1);
      expect(apiKeys[0].name).toBe("User 1 Key");
    });
  });

  describe("validateApiKey", () => {
    it("validates correct API key and returns record", () => {
      const { plainKey, apiKey: created } = createApiKey(testDb, {
        userId: "user_1",
        name: "My API Key",
      });

      const validated = validateApiKey(testDb, plainKey);
      expect(validated?.id).toBe(created.id);
    });

    it("returns undefined for invalid API key", () => {
      createApiKey(testDb, {
        userId: "user_1",
        name: "My API Key",
      });

      const validated = validateApiKey(testDb, "rlk_invalid_key_000000000000");
      expect(validated).toBeUndefined();
    });

    it("updates last_used_at on successful validation", () => {
      const { plainKey, apiKey: created } = createApiKey(testDb, {
        userId: "user_1",
        name: "My API Key",
      });

      expect(created.last_used_at).toBeNull();

      validateApiKey(testDb, plainKey);

      const updated = getApiKeyById(testDb, created.id);
      expect(updated?.last_used_at).not.toBeNull();
    });
  });

  describe("deleteApiKey", () => {
    it("deletes an API key", () => {
      const { apiKey } = createApiKey(testDb, {
        userId: "user_1",
        name: "My API Key",
      });

      const result = deleteApiKey(testDb, apiKey.id);

      expect(result).toBe(true);
      expect(getApiKeyById(testDb, apiKey.id)).toBeUndefined();
    });

    it("returns false for non-existent API key", () => {
      const result = deleteApiKey(testDb, "nonexistent");
      expect(result).toBe(false);
    });

    it("completely removes API key from database", () => {
      const { apiKey } = createApiKey(testDb, {
        userId: "user_1",
        name: "My API Key",
      });

      deleteApiKey(testDb, apiKey.id);

      // Should not exist in database at all (hard delete, not soft delete)
      const row = testDb
        .prepare("SELECT * FROM api_keys WHERE id = ?")
        .get(apiKey.id);
      expect(row).toBeUndefined();
    });
  });
});
