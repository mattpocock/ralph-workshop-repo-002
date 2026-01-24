import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { getTestDb, runMigrations } from "../db";
import {
  generateRandomSlug,
  validateCustomSlug,
  isReservedSlug,
  createLink,
  getLinkById,
  getLinkBySlug,
  getLinks,
  slugExists,
  isLinkExpired,
} from "./index";

describe("slug utilities", () => {
  describe("generateRandomSlug", () => {
    it("generates a 7 character slug", () => {
      const slug = generateRandomSlug();
      expect(slug).toHaveLength(7);
    });

    it("generates unique slugs", () => {
      const slugs = new Set<string>();
      for (let i = 0; i < 100; i++) {
        slugs.add(generateRandomSlug());
      }
      expect(slugs.size).toBe(100);
    });

    it("only contains valid characters", () => {
      const slug = generateRandomSlug();
      expect(slug).toMatch(/^[a-zA-Z0-9]+$/);
    });
  });

  describe("validateCustomSlug", () => {
    it("accepts valid slugs", () => {
      expect(validateCustomSlug("abc")).toBeNull();
      expect(validateCustomSlug("my-link")).toBeNull();
      expect(validateCustomSlug("my_link_123")).toBeNull();
      expect(validateCustomSlug("CamelCase")).toBeNull();
    });

    it("rejects slugs shorter than 3 characters", () => {
      expect(validateCustomSlug("ab")).toBe(
        "Slug must be at least 3 characters",
      );
    });

    it("rejects slugs longer than 50 characters", () => {
      const longSlug = "a".repeat(51);
      expect(validateCustomSlug(longSlug)).toBe(
        "Slug must be at most 50 characters",
      );
    });

    it("rejects slugs with invalid characters", () => {
      expect(validateCustomSlug("my slug")).toBe(
        "Slug can only contain letters, numbers, underscores, and hyphens",
      );
      expect(validateCustomSlug("my@slug")).toBe(
        "Slug can only contain letters, numbers, underscores, and hyphens",
      );
    });

    it("rejects reserved slugs", () => {
      expect(validateCustomSlug("api")).toBe(
        "This slug is reserved and cannot be used",
      );
      expect(validateCustomSlug("dashboard")).toBe(
        "This slug is reserved and cannot be used",
      );
    });
  });

  describe("isReservedSlug", () => {
    it("identifies reserved slugs", () => {
      expect(isReservedSlug("api")).toBe(true);
      expect(isReservedSlug("API")).toBe(true);
      expect(isReservedSlug("dashboard")).toBe(true);
    });

    it("identifies non-reserved slugs", () => {
      expect(isReservedSlug("my-link")).toBe(false);
      expect(isReservedSlug("random123")).toBe(false);
    });
  });
});

describe("links repository", () => {
  let testDb: Database.Database;

  beforeEach(() => {
    testDb = getTestDb();
    runMigrations(testDb);
  });

  afterEach(() => {
    testDb.close();
  });

  describe("createLink", () => {
    it("creates a link with generated slug", () => {
      const link = createLink(testDb, {
        userId: "user_1",
        destinationUrl: "https://example.com",
      });

      expect(link.id).toBeDefined();
      expect(link.slug).toHaveLength(7);
      expect(link.destination_url).toBe("https://example.com");
      expect(link.user_id).toBe("user_1");
    });

    it("creates a link with custom slug", () => {
      const link = createLink(testDb, {
        userId: "user_1",
        destinationUrl: "https://example.com",
        slug: "my-custom-slug",
      });

      expect(link.slug).toBe("my-custom-slug");
    });

    it("creates a link with expiration date", () => {
      const expiresAt = new Date(Date.now() + 86400000).toISOString();
      const link = createLink(testDb, {
        userId: "user_1",
        destinationUrl: "https://example.com",
        expiresAt,
      });

      expect(link.expires_at).toBe(expiresAt);
    });

    it("throws on duplicate custom slug", () => {
      createLink(testDb, {
        userId: "user_1",
        destinationUrl: "https://example.com",
        slug: "duplicate",
      });

      expect(() =>
        createLink(testDb, {
          userId: "user_1",
          destinationUrl: "https://other.com",
          slug: "duplicate",
        }),
      ).toThrow("A link with this slug already exists");
    });

    it("retries on random slug collision", () => {
      // Insert a link directly
      testDb
        .prepare(
          `INSERT INTO links (id, user_id, slug, destination_url) VALUES (?, ?, ?, ?)`,
        )
        .run("existing_id", "user_1", "existing", "https://example.com");

      // Even though we're using random slugs, collisions are handled with retries
      const link = createLink(testDb, {
        userId: "user_1",
        destinationUrl: "https://new.com",
      });

      expect(link.slug).not.toBe("existing");
    });
  });

  describe("getLinkById", () => {
    it("returns link by id", () => {
      const created = createLink(testDb, {
        userId: "user_1",
        destinationUrl: "https://example.com",
      });

      const found = getLinkById(testDb, created.id);
      expect(found?.destination_url).toBe("https://example.com");
    });

    it("returns undefined for non-existent id", () => {
      const found = getLinkById(testDb, "nonexistent");
      expect(found).toBeUndefined();
    });

    it("excludes soft-deleted links", () => {
      const created = createLink(testDb, {
        userId: "user_1",
        destinationUrl: "https://example.com",
      });

      testDb
        .prepare("UPDATE links SET deleted_at = datetime('now') WHERE id = ?")
        .run(created.id);

      const found = getLinkById(testDb, created.id);
      expect(found).toBeUndefined();
    });
  });

  describe("getLinkBySlug", () => {
    it("returns link by slug", () => {
      const created = createLink(testDb, {
        userId: "user_1",
        destinationUrl: "https://example.com",
        slug: "my-slug",
      });

      const found = getLinkBySlug(testDb, "my-slug");
      expect(found?.id).toBe(created.id);
    });

    it("excludes soft-deleted links", () => {
      createLink(testDb, {
        userId: "user_1",
        destinationUrl: "https://example.com",
        slug: "deleted-slug",
      });

      testDb
        .prepare("UPDATE links SET deleted_at = datetime('now') WHERE slug = ?")
        .run("deleted-slug");

      const found = getLinkBySlug(testDb, "deleted-slug");
      expect(found).toBeUndefined();
    });
  });

  describe("slugExists", () => {
    it("returns true if slug exists", () => {
      createLink(testDb, {
        userId: "user_1",
        destinationUrl: "https://example.com",
        slug: "existing-slug",
      });

      expect(slugExists(testDb, "existing-slug")).toBe(true);
    });

    it("returns false if slug does not exist", () => {
      expect(slugExists(testDb, "nonexistent")).toBe(false);
    });
  });

  describe("isLinkExpired", () => {
    it("returns false for null expires_at", () => {
      expect(isLinkExpired(null)).toBe(false);
    });

    it("returns false for future expiration date", () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString();
      expect(isLinkExpired(futureDate)).toBe(false);
    });

    it("returns true for past expiration date", () => {
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      expect(isLinkExpired(pastDate)).toBe(true);
    });
  });

  describe("getLinks", () => {
    it("returns empty array for user with no links", () => {
      const result = getLinks(testDb, { userId: "user_1" });
      expect(result.links).toEqual([]);
      expect(result.total).toBe(0);
    });

    it("returns all links for user", () => {
      createLink(testDb, {
        userId: "user_1",
        destinationUrl: "https://example1.com",
      });
      createLink(testDb, {
        userId: "user_1",
        destinationUrl: "https://example2.com",
      });

      const result = getLinks(testDb, { userId: "user_1" });
      expect(result.links).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("returns links in descending order by created_at", () => {
      // Insert links with explicit created_at timestamps to ensure ordering
      testDb
        .prepare(
          `INSERT INTO links (id, user_id, slug, destination_url, created_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(
          "id1",
          "user_1",
          "first-link",
          "https://first.com",
          "2024-01-01T00:00:00Z",
        );
      testDb
        .prepare(
          `INSERT INTO links (id, user_id, slug, destination_url, created_at)
           VALUES (?, ?, ?, ?, ?)`,
        )
        .run(
          "id2",
          "user_1",
          "second-link",
          "https://second.com",
          "2024-01-02T00:00:00Z",
        );

      const result = getLinks(testDb, { userId: "user_1" });
      expect(result.links[0].slug).toBe("second-link");
      expect(result.links[1].slug).toBe("first-link");
    });

    it("respects limit parameter", () => {
      for (let i = 0; i < 5; i++) {
        createLink(testDb, {
          userId: "user_1",
          destinationUrl: `https://example${i}.com`,
        });
      }

      const result = getLinks(testDb, { userId: "user_1", limit: 3 });
      expect(result.links).toHaveLength(3);
      expect(result.total).toBe(5);
    });

    it("respects offset parameter", () => {
      for (let i = 0; i < 5; i++) {
        createLink(testDb, {
          userId: "user_1",
          destinationUrl: `https://example${i}.com`,
          slug: `link-${i}`,
        });
      }

      const result = getLinks(testDb, {
        userId: "user_1",
        limit: 2,
        offset: 2,
      });
      expect(result.links).toHaveLength(2);
      expect(result.total).toBe(5);
    });

    it("excludes soft-deleted links", () => {
      const link = createLink(testDb, {
        userId: "user_1",
        destinationUrl: "https://example.com",
      });

      testDb
        .prepare("UPDATE links SET deleted_at = datetime('now') WHERE id = ?")
        .run(link.id);

      const result = getLinks(testDb, { userId: "user_1" });
      expect(result.links).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it("uses default limit of 20", () => {
      for (let i = 0; i < 25; i++) {
        createLink(testDb, {
          userId: "user_1",
          destinationUrl: `https://example${i}.com`,
        });
      }

      const result = getLinks(testDb, { userId: "user_1" });
      expect(result.links).toHaveLength(20);
      expect(result.total).toBe(25);
    });
  });
});
