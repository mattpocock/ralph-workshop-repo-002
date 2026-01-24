import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { getTestDb, runMigrations } from "../db";
import { createTag, getTagById, getTags, softDeleteTag } from "./index";

describe("tags repository", () => {
  let testDb: Database.Database;

  beforeEach(() => {
    testDb = getTestDb();
    runMigrations(testDb);
  });

  afterEach(() => {
    testDb.close();
  });

  describe("createTag", () => {
    it("creates a tag", () => {
      const tag = createTag(testDb, {
        userId: "user_1",
        name: "work",
      });

      expect(tag.id).toBeDefined();
      expect(tag.name).toBe("work");
      expect(tag.user_id).toBe("user_1");
      expect(tag.created_at).toBeDefined();
    });

    it("throws on duplicate tag name for same user", () => {
      createTag(testDb, {
        userId: "user_1",
        name: "work",
      });

      expect(() =>
        createTag(testDb, {
          userId: "user_1",
          name: "work",
        }),
      ).toThrow("A tag with this name already exists");
    });

    it("allows same tag name for different users", () => {
      // Insert another user for testing
      testDb
        .prepare("INSERT INTO users (id, email, name) VALUES (?, ?, ?)")
        .run("user_2", "test2@example.com", "Test User 2");

      const tag1 = createTag(testDb, {
        userId: "user_1",
        name: "work",
      });
      const tag2 = createTag(testDb, {
        userId: "user_2",
        name: "work",
      });

      expect(tag1.user_id).toBe("user_1");
      expect(tag2.user_id).toBe("user_2");
    });
  });

  describe("getTagById", () => {
    it("returns tag by id", () => {
      const created = createTag(testDb, {
        userId: "user_1",
        name: "work",
      });

      const found = getTagById(testDb, created.id);
      expect(found?.name).toBe("work");
    });

    it("returns undefined for non-existent id", () => {
      const found = getTagById(testDb, "nonexistent");
      expect(found).toBeUndefined();
    });

    it("excludes soft-deleted tags", () => {
      const created = createTag(testDb, {
        userId: "user_1",
        name: "work",
      });

      testDb
        .prepare("UPDATE tags SET deleted_at = datetime('now') WHERE id = ?")
        .run(created.id);

      const found = getTagById(testDb, created.id);
      expect(found).toBeUndefined();
    });
  });

  describe("getTags", () => {
    it("returns empty array for user with no tags", () => {
      const tags = getTags(testDb, "user_1");
      expect(tags).toEqual([]);
    });

    it("returns all tags for user ordered by name", () => {
      createTag(testDb, { userId: "user_1", name: "zebra" });
      createTag(testDb, { userId: "user_1", name: "apple" });
      createTag(testDb, { userId: "user_1", name: "mango" });

      const tags = getTags(testDb, "user_1");
      expect(tags).toHaveLength(3);
      expect(tags[0].name).toBe("apple");
      expect(tags[1].name).toBe("mango");
      expect(tags[2].name).toBe("zebra");
    });

    it("excludes soft-deleted tags", () => {
      const tag = createTag(testDb, {
        userId: "user_1",
        name: "work",
      });

      testDb
        .prepare("UPDATE tags SET deleted_at = datetime('now') WHERE id = ?")
        .run(tag.id);

      const tags = getTags(testDb, "user_1");
      expect(tags).toHaveLength(0);
    });

    it("only returns tags for specified user", () => {
      // Insert another user for testing
      testDb
        .prepare("INSERT INTO users (id, email, name) VALUES (?, ?, ?)")
        .run("user_2", "test2@example.com", "Test User 2");

      createTag(testDb, { userId: "user_1", name: "work" });
      createTag(testDb, { userId: "user_2", name: "personal" });

      const tags = getTags(testDb, "user_1");
      expect(tags).toHaveLength(1);
      expect(tags[0].name).toBe("work");
    });
  });

  describe("softDeleteTag", () => {
    it("soft deletes a tag", () => {
      const tag = createTag(testDb, {
        userId: "user_1",
        name: "work",
      });

      const result = softDeleteTag(testDb, tag.id);

      expect(result).toBe(true);
      expect(getTagById(testDb, tag.id)).toBeUndefined();
    });

    it("returns false for non-existent tag", () => {
      const result = softDeleteTag(testDb, "nonexistent");

      expect(result).toBe(false);
    });

    it("returns false for already soft-deleted tag", () => {
      const tag = createTag(testDb, {
        userId: "user_1",
        name: "work",
      });

      softDeleteTag(testDb, tag.id);
      const result = softDeleteTag(testDb, tag.id);

      expect(result).toBe(false);
    });

    it("preserves soft-deleted tag in database", () => {
      const tag = createTag(testDb, {
        userId: "user_1",
        name: "work",
      });

      softDeleteTag(testDb, tag.id);

      // Tag should still exist in database with deleted_at set
      const row = testDb
        .prepare("SELECT * FROM tags WHERE id = ?")
        .get(tag.id) as { deleted_at: string | null } | undefined;
      expect(row).toBeDefined();
      expect(row?.deleted_at).not.toBeNull();
    });
  });
});
