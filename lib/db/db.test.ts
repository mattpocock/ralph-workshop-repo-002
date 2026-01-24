import { describe, it, expect, beforeEach, afterEach } from "vitest";
import Database from "better-sqlite3";
import { getTestDb, runMigrations } from "./index";

describe("db module", () => {
  let testDb: Database.Database;

  beforeEach(() => {
    testDb = getTestDb();
    runMigrations(testDb);
  });

  afterEach(() => {
    testDb.close();
  });

  it("runs migrations and creates tables", () => {
    const tables = testDb
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
      )
      .all()
      .map((row) => (row as { name: string }).name);

    expect(tables).toContain("users");
    expect(tables).toContain("links");
    expect(tables).toContain("_migrations");
  });

  it("seeds dummy user", () => {
    const user = testDb
      .prepare("SELECT * FROM users WHERE id = ?")
      .get("user_1") as { id: string; email: string; name: string } | undefined;

    expect(user).toBeDefined();
    expect(user?.email).toBe("dummy@example.com");
    expect(user?.name).toBe("Dummy User");
  });

  it("allows inserting and querying links", () => {
    testDb
      .prepare(
        `
      INSERT INTO links (id, user_id, slug, destination_url)
      VALUES (?, ?, ?, ?)
    `,
      )
      .run("link_1", "user_1", "test-slug", "https://example.com");

    const link = testDb
      .prepare("SELECT * FROM links WHERE slug = ?")
      .get("test-slug") as { destination_url: string } | undefined;

    expect(link?.destination_url).toBe("https://example.com");
  });

  it("enforces unique slug constraint", () => {
    testDb
      .prepare(
        `
      INSERT INTO links (id, user_id, slug, destination_url)
      VALUES (?, ?, ?, ?)
    `,
      )
      .run("link_1", "user_1", "unique-slug", "https://example.com");

    expect(() => {
      testDb
        .prepare(
          `
        INSERT INTO links (id, user_id, slug, destination_url)
        VALUES (?, ?, ?, ?)
      `,
        )
        .run("link_2", "user_1", "unique-slug", "https://other.com");
    }).toThrow();
  });

  it("enforces foreign key constraint for user_id", () => {
    expect(() => {
      testDb
        .prepare(
          `
        INSERT INTO links (id, user_id, slug, destination_url)
        VALUES (?, ?, ?, ?)
      `,
        )
        .run("link_1", "nonexistent_user", "test-slug", "https://example.com");
    }).toThrow();
  });
});
