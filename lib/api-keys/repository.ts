import type Database from "better-sqlite3";
import crypto from "crypto";

export interface ApiKey {
  id: string;
  user_id: string;
  key_hash: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
}

export interface CreateApiKeyInput {
  userId: string;
  name: string;
}

export interface CreateApiKeyResult {
  apiKey: ApiKey;
  plainKey: string;
}

/**
 * Generates a random API key with a prefix for identification
 * Format: rlk_<32 random hex characters> (40 chars total)
 */
function generateApiKey(): string {
  const randomBytes = crypto.randomBytes(16).toString("hex");
  return `rlk_${randomBytes}`;
}

/**
 * Hashes an API key using SHA-256
 */
function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/**
 * Creates a new API key in the database
 * Returns both the API key record and the plain key (only available at creation time)
 */
export function createApiKey(
  db: Database.Database,
  input: CreateApiKeyInput,
): CreateApiKeyResult {
  const id = crypto.randomUUID();
  const plainKey = generateApiKey();
  const keyHash = hashApiKey(plainKey);

  const stmt = db.prepare(`
    INSERT INTO api_keys (id, user_id, key_hash, name)
    VALUES (?, ?, ?, ?)
  `);

  stmt.run(id, input.userId, keyHash, input.name);

  const apiKey = getApiKeyById(db, id)!;
  return { apiKey, plainKey };
}

/**
 * Gets an API key by ID
 */
export function getApiKeyById(
  db: Database.Database,
  id: string,
): ApiKey | undefined {
  const stmt = db.prepare(`
    SELECT * FROM api_keys WHERE id = ?
  `);
  return stmt.get(id) as ApiKey | undefined;
}

/**
 * Gets all API keys for a user
 */
export function getApiKeys(db: Database.Database, userId: string): ApiKey[] {
  const stmt = db.prepare(`
    SELECT * FROM api_keys
    WHERE user_id = ?
    ORDER BY created_at DESC
  `);
  return stmt.all(userId) as ApiKey[];
}

/**
 * Validates an API key and returns the matching record if valid
 * Also updates last_used_at timestamp
 */
export function validateApiKey(
  db: Database.Database,
  plainKey: string,
): ApiKey | undefined {
  const keyHash = hashApiKey(plainKey);

  const stmt = db.prepare(`
    SELECT * FROM api_keys WHERE key_hash = ?
  `);
  const apiKey = stmt.get(keyHash) as ApiKey | undefined;

  if (apiKey) {
    // Update last_used_at
    db.prepare(
      `
      UPDATE api_keys SET last_used_at = datetime('now') WHERE id = ?
    `,
    ).run(apiKey.id);
  }

  return apiKey;
}

/**
 * Deletes an API key by ID
 * Returns true if the key was deleted, false if not found
 */
export function deleteApiKey(db: Database.Database, id: string): boolean {
  const apiKey = getApiKeyById(db, id);
  if (!apiKey) {
    return false;
  }

  const stmt = db.prepare(`
    DELETE FROM api_keys WHERE id = ?
  `);
  stmt.run(id);

  return true;
}
