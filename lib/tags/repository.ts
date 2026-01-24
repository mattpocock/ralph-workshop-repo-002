import type Database from "better-sqlite3";
import crypto from "crypto";

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  deleted_at: string | null;
}

export interface CreateTagInput {
  userId: string;
  name: string;
}

/**
 * Creates a new tag in the database
 * Throws if a tag with the same name already exists for this user
 */
export function createTag(db: Database.Database, input: CreateTagInput): Tag {
  const id = crypto.randomUUID();

  const stmt = db.prepare(`
    INSERT INTO tags (id, user_id, name)
    VALUES (?, ?, ?)
  `);

  try {
    stmt.run(id, input.userId, input.name);
    return getTagById(db, id)!;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("UNIQUE constraint failed")
    ) {
      throw new Error("A tag with this name already exists");
    }
    throw error;
  }
}

/**
 * Gets a tag by ID
 */
export function getTagById(db: Database.Database, id: string): Tag | undefined {
  const stmt = db.prepare(`
    SELECT * FROM tags WHERE id = ? AND deleted_at IS NULL
  `);
  return stmt.get(id) as Tag | undefined;
}

/**
 * Gets all tags for a user (excluding soft-deleted)
 */
export function getTags(db: Database.Database, userId: string): Tag[] {
  const stmt = db.prepare(`
    SELECT * FROM tags
    WHERE user_id = ? AND deleted_at IS NULL
    ORDER BY name ASC
  `);
  return stmt.all(userId) as Tag[];
}

/**
 * Soft deletes a tag by setting deleted_at
 * Returns true if the tag was deleted, false if not found
 */
export function softDeleteTag(db: Database.Database, id: string): boolean {
  const tag = getTagById(db, id);
  if (!tag) {
    return false;
  }

  const stmt = db.prepare(`
    UPDATE tags SET deleted_at = datetime('now') WHERE id = ?
  `);
  stmt.run(id);

  return true;
}
