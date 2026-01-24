import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { getTestDb, runMigrations } from "../db";
import { createLink } from "../links";
import { createTag } from "../tags";
import {
  addTagToLink,
  removeTagFromLink,
  getTagsForLink,
  getLinksForTag,
  removeAllTagsFromLink,
  setTagsForLink,
} from "./index";

describe("link-tags repository", () => {
  let testDb: Database.Database;

  beforeEach(() => {
    testDb = getTestDb();
    runMigrations(testDb);
  });

  afterEach(() => {
    testDb.close();
  });

  describe("addTagToLink", () => {
    it("adds a tag to a link", () => {
      const link = createLink(testDb, {
        userId: "user_1",
        destinationUrl: "https://example.com",
      });
      const tag = createTag(testDb, {
        userId: "user_1",
        name: "work",
      });

      const result = addTagToLink(testDb, link.id, tag.id);

      expect(result).toBe(true);
      const tags = getTagsForLink(testDb, link.id);
      expect(tags).toHaveLength(1);
      expect(tags[0].id).toBe(tag.id);
    });

    it("returns false when adding duplicate tag to link", () => {
      const link = createLink(testDb, {
        userId: "user_1",
        destinationUrl: "https://example.com",
      });
      const tag = createTag(testDb, {
        userId: "user_1",
        name: "work",
      });

      addTagToLink(testDb, link.id, tag.id);
      const result = addTagToLink(testDb, link.id, tag.id);

      expect(result).toBe(false);
      const tags = getTagsForLink(testDb, link.id);
      expect(tags).toHaveLength(1);
    });

    it("allows multiple tags on same link", () => {
      const link = createLink(testDb, {
        userId: "user_1",
        destinationUrl: "https://example.com",
      });
      const tag1 = createTag(testDb, { userId: "user_1", name: "work" });
      const tag2 = createTag(testDb, { userId: "user_1", name: "important" });

      addTagToLink(testDb, link.id, tag1.id);
      addTagToLink(testDb, link.id, tag2.id);

      const tags = getTagsForLink(testDb, link.id);
      expect(tags).toHaveLength(2);
    });
  });

  describe("removeTagFromLink", () => {
    it("removes a tag from a link", () => {
      const link = createLink(testDb, {
        userId: "user_1",
        destinationUrl: "https://example.com",
      });
      const tag = createTag(testDb, { userId: "user_1", name: "work" });
      addTagToLink(testDb, link.id, tag.id);

      const result = removeTagFromLink(testDb, link.id, tag.id);

      expect(result).toBe(true);
      const tags = getTagsForLink(testDb, link.id);
      expect(tags).toHaveLength(0);
    });

    it("returns false when tag was not associated", () => {
      const link = createLink(testDb, {
        userId: "user_1",
        destinationUrl: "https://example.com",
      });
      const tag = createTag(testDb, { userId: "user_1", name: "work" });

      const result = removeTagFromLink(testDb, link.id, tag.id);

      expect(result).toBe(false);
    });
  });

  describe("getTagsForLink", () => {
    it("returns empty array for link with no tags", () => {
      const link = createLink(testDb, {
        userId: "user_1",
        destinationUrl: "https://example.com",
      });

      const tags = getTagsForLink(testDb, link.id);

      expect(tags).toEqual([]);
    });

    it("returns tags sorted by name", () => {
      const link = createLink(testDb, {
        userId: "user_1",
        destinationUrl: "https://example.com",
      });
      const tag1 = createTag(testDb, { userId: "user_1", name: "zebra" });
      const tag2 = createTag(testDb, { userId: "user_1", name: "apple" });

      addTagToLink(testDb, link.id, tag1.id);
      addTagToLink(testDb, link.id, tag2.id);

      const tags = getTagsForLink(testDb, link.id);
      expect(tags[0].name).toBe("apple");
      expect(tags[1].name).toBe("zebra");
    });

    it("excludes soft-deleted tags", () => {
      const link = createLink(testDb, {
        userId: "user_1",
        destinationUrl: "https://example.com",
      });
      const tag = createTag(testDb, { userId: "user_1", name: "work" });
      addTagToLink(testDb, link.id, tag.id);

      // Soft delete the tag
      testDb
        .prepare("UPDATE tags SET deleted_at = datetime('now') WHERE id = ?")
        .run(tag.id);

      const tags = getTagsForLink(testDb, link.id);
      expect(tags).toHaveLength(0);
    });
  });

  describe("getLinksForTag", () => {
    it("returns empty array for tag with no links", () => {
      const tag = createTag(testDb, { userId: "user_1", name: "work" });

      const links = getLinksForTag(testDb, tag.id);

      expect(links).toEqual([]);
    });

    it("returns links sorted by created_at descending", () => {
      const tag = createTag(testDb, { userId: "user_1", name: "work" });
      const link1 = createLink(testDb, {
        userId: "user_1",
        destinationUrl: "https://example1.com",
      });
      const link2 = createLink(testDb, {
        userId: "user_1",
        destinationUrl: "https://example2.com",
      });

      // Manually set different timestamps to ensure order
      testDb
        .prepare(
          "UPDATE links SET created_at = '2024-01-01 00:00:00' WHERE id = ?",
        )
        .run(link1.id);
      testDb
        .prepare(
          "UPDATE links SET created_at = '2024-01-02 00:00:00' WHERE id = ?",
        )
        .run(link2.id);

      addTagToLink(testDb, link1.id, tag.id);
      addTagToLink(testDb, link2.id, tag.id);

      const links = getLinksForTag(testDb, tag.id);
      expect(links).toHaveLength(2);
      // Most recently created first
      expect(links[0].id).toBe(link2.id);
      expect(links[1].id).toBe(link1.id);
    });

    it("excludes soft-deleted links", () => {
      const tag = createTag(testDb, { userId: "user_1", name: "work" });
      const link = createLink(testDb, {
        userId: "user_1",
        destinationUrl: "https://example.com",
      });
      addTagToLink(testDb, link.id, tag.id);

      // Soft delete the link
      testDb
        .prepare("UPDATE links SET deleted_at = datetime('now') WHERE id = ?")
        .run(link.id);

      const links = getLinksForTag(testDb, tag.id);
      expect(links).toHaveLength(0);
    });
  });

  describe("removeAllTagsFromLink", () => {
    it("removes all tags from a link", () => {
      const link = createLink(testDb, {
        userId: "user_1",
        destinationUrl: "https://example.com",
      });
      const tag1 = createTag(testDb, { userId: "user_1", name: "work" });
      const tag2 = createTag(testDb, { userId: "user_1", name: "important" });
      addTagToLink(testDb, link.id, tag1.id);
      addTagToLink(testDb, link.id, tag2.id);

      const removed = removeAllTagsFromLink(testDb, link.id);

      expect(removed).toBe(2);
      const tags = getTagsForLink(testDb, link.id);
      expect(tags).toHaveLength(0);
    });

    it("returns 0 for link with no tags", () => {
      const link = createLink(testDb, {
        userId: "user_1",
        destinationUrl: "https://example.com",
      });

      const removed = removeAllTagsFromLink(testDb, link.id);

      expect(removed).toBe(0);
    });
  });

  describe("setTagsForLink", () => {
    it("sets tags for a link", () => {
      const link = createLink(testDb, {
        userId: "user_1",
        destinationUrl: "https://example.com",
      });
      const tag1 = createTag(testDb, { userId: "user_1", name: "work" });
      const tag2 = createTag(testDb, { userId: "user_1", name: "important" });

      setTagsForLink(testDb, link.id, [tag1.id, tag2.id]);

      const tags = getTagsForLink(testDb, link.id);
      expect(tags).toHaveLength(2);
    });

    it("replaces existing tags", () => {
      const link = createLink(testDb, {
        userId: "user_1",
        destinationUrl: "https://example.com",
      });
      const tag1 = createTag(testDb, { userId: "user_1", name: "work" });
      const tag2 = createTag(testDb, { userId: "user_1", name: "important" });
      const tag3 = createTag(testDb, { userId: "user_1", name: "personal" });

      setTagsForLink(testDb, link.id, [tag1.id, tag2.id]);
      setTagsForLink(testDb, link.id, [tag3.id]);

      const tags = getTagsForLink(testDb, link.id);
      expect(tags).toHaveLength(1);
      expect(tags[0].id).toBe(tag3.id);
    });

    it("removes all tags when empty array passed", () => {
      const link = createLink(testDb, {
        userId: "user_1",
        destinationUrl: "https://example.com",
      });
      const tag = createTag(testDb, { userId: "user_1", name: "work" });
      setTagsForLink(testDb, link.id, [tag.id]);

      setTagsForLink(testDb, link.id, []);

      const tags = getTagsForLink(testDb, link.id);
      expect(tags).toHaveLength(0);
    });
  });
});
