import crypto from "crypto";

const SLUG_LENGTH = 7;
const SLUG_CHARS =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

// Reserved slugs that cannot be used (routes that exist in the app)
const RESERVED_SLUGS = new Set([
  "api",
  "dashboard",
  "login",
  "logout",
  "docs",
  "health",
  "settings",
  "admin",
]);

/**
 * Generates a random slug of SLUG_LENGTH characters
 */
export function generateRandomSlug(): string {
  let slug = "";
  const bytes = crypto.randomBytes(SLUG_LENGTH);
  for (let i = 0; i < SLUG_LENGTH; i++) {
    slug += SLUG_CHARS[bytes[i] % SLUG_CHARS.length];
  }
  return slug;
}

/**
 * Validates a custom slug
 * Returns null if valid, or an error message if invalid
 */
export function validateCustomSlug(slug: string): string | null {
  if (slug.length < 3) {
    return "Slug must be at least 3 characters";
  }

  if (slug.length > 50) {
    return "Slug must be at most 50 characters";
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
    return "Slug can only contain letters, numbers, underscores, and hyphens";
  }

  if (RESERVED_SLUGS.has(slug.toLowerCase())) {
    return "This slug is reserved and cannot be used";
  }

  return null;
}

/**
 * Checks if a slug is reserved
 */
export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}
