import type Database from "better-sqlite3";
import type { Tag } from "../tags";
import type { Link } from "../links";

export interface LinkTag {
  link_id: string;
  tag_id: string;
  created_at: string;
}

/**
 * Adds a tag to a link
 * Returns true if the association was created, false if it already exists
 */
export function addTagToLink(
  db: Database.Database,
  linkId: string,
  tagId: string,
): boolean {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO link_tags (link_id, tag_id)
    VALUES (?, ?)
  `);
  const result = stmt.run(linkId, tagId);
  return result.changes > 0;
}

/**
 * Removes a tag from a link
 * Returns true if the association was removed, false if it didn't exist
 */
export function removeTagFromLink(
  db: Database.Database,
  linkId: string,
  tagId: string,
): boolean {
  const stmt = db.prepare(`
    DELETE FROM link_tags WHERE link_id = ? AND tag_id = ?
  `);
  const result = stmt.run(linkId, tagId);
  return result.changes > 0;
}

/**
 * Gets all tags for a link (excluding soft-deleted tags)
 */
export function getTagsForLink(db: Database.Database, linkId: string): Tag[] {
  const stmt = db.prepare(`
    SELECT t.* FROM tags t
    INNER JOIN link_tags lt ON lt.tag_id = t.id
    WHERE lt.link_id = ? AND t.deleted_at IS NULL
    ORDER BY t.name ASC
  `);
  return stmt.all(linkId) as Tag[];
}

/**
 * Gets all links for a tag (excluding soft-deleted links)
 */
export function getLinksForTag(db: Database.Database, tagId: string): Link[] {
  const stmt = db.prepare(`
    SELECT l.* FROM links l
    INNER JOIN link_tags lt ON lt.link_id = l.id
    WHERE lt.tag_id = ? AND l.deleted_at IS NULL
    ORDER BY l.created_at DESC
  `);
  return stmt.all(tagId) as Link[];
}

/**
 * Removes all tags from a link
 * Returns the number of associations removed
 */
export function removeAllTagsFromLink(
  db: Database.Database,
  linkId: string,
): number {
  const stmt = db.prepare(`
    DELETE FROM link_tags WHERE link_id = ?
  `);
  const result = stmt.run(linkId);
  return result.changes;
}

/**
 * Sets the tags for a link (replaces all existing tags)
 * This is useful for updating a link's tags in one operation
 */
export function setTagsForLink(
  db: Database.Database,
  linkId: string,
  tagIds: string[],
): void {
  // Remove existing associations
  removeAllTagsFromLink(db, linkId);

  // Add new associations
  if (tagIds.length > 0) {
    const stmt = db.prepare(`
      INSERT INTO link_tags (link_id, tag_id) VALUES (?, ?)
    `);
    for (const tagId of tagIds) {
      stmt.run(linkId, tagId);
    }
  }
}
