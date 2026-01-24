import type Database from "better-sqlite3";
import crypto from "crypto";
import { generateRandomSlug } from "./slug";

export interface Link {
  id: string;
  user_id: string;
  slug: string;
  destination_url: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CreateLinkInput {
  userId: string;
  destinationUrl: string;
  slug?: string;
  expiresAt?: string;
}

/**
 * Creates a new link in the database
 * If no slug is provided, generates a random one
 * Retries up to maxRetries times if slug collision occurs
 */
export function createLink(
  db: Database.Database,
  input: CreateLinkInput,
  maxRetries = 5,
): Link {
  const id = crypto.randomUUID();
  const slug = input.slug || generateRandomSlug();

  const stmt = db.prepare(`
    INSERT INTO links (id, user_id, slug, destination_url, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const currentSlug = attempt === 0 ? slug : generateRandomSlug();

    try {
      stmt.run(
        id,
        input.userId,
        currentSlug,
        input.destinationUrl,
        input.expiresAt || null,
      );

      // Fetch and return the created link
      return getLinkById(db, id)!;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed")
      ) {
        // If custom slug was provided and it conflicts, don't retry
        if (input.slug && attempt === 0) {
          throw new Error("A link with this slug already exists");
        }
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError || new Error("Failed to create link after multiple retries");
}

/**
 * Gets a link by ID
 */
export function getLinkById(
  db: Database.Database,
  id: string,
): Link | undefined {
  const stmt = db.prepare(`
    SELECT * FROM links WHERE id = ? AND deleted_at IS NULL
  `);
  return stmt.get(id) as Link | undefined;
}

/**
 * Gets a link by slug (for redirects)
 */
export function getLinkBySlug(
  db: Database.Database,
  slug: string,
): Link | undefined {
  const stmt = db.prepare(`
    SELECT * FROM links WHERE slug = ? AND deleted_at IS NULL
  `);
  return stmt.get(slug) as Link | undefined;
}

/**
 * Checks if a slug exists
 */
export function slugExists(db: Database.Database, slug: string): boolean {
  const stmt = db.prepare(`
    SELECT 1 FROM links WHERE slug = ?
  `);
  return stmt.get(slug) !== undefined;
}

/**
 * Check if a link has expired based on its expires_at field
 */
export function isLinkExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

export interface GetLinksOptions {
  userId: string;
  limit?: number;
  offset?: number;
}

export interface GetLinksResult {
  links: Link[];
  total: number;
}

/**
 * Gets paginated links for a user
 */
export function getLinks(
  db: Database.Database,
  options: GetLinksOptions,
): GetLinksResult {
  const { userId, limit = 20, offset = 0 } = options;

  // Get total count
  const countStmt = db.prepare(`
    SELECT COUNT(*) as count FROM links
    WHERE user_id = ? AND deleted_at IS NULL
  `);
  const { count: total } = countStmt.get(userId) as { count: number };

  // Get paginated links
  const stmt = db.prepare(`
    SELECT * FROM links
    WHERE user_id = ? AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `);
  const links = stmt.all(userId, limit, offset) as Link[];

  return { links, total };
}
