import { NextRequest, NextResponse } from "next/server";
import type Database from "better-sqlite3";
import { getDb, runMigrations } from "@/lib/db";
import { validateApiKey, type ApiKey } from "@/lib/api-keys";
import { checkRateLimit, getRateLimitConfig } from "@/lib/rate-limiter";

export interface RateLimitedRequest {
  request: NextRequest;
  db: Database.Database;
  apiKey: ApiKey | null;
  userId: string;
}

type RouteHandler = (
  context: RateLimitedRequest,
) => Promise<NextResponse> | NextResponse;

/**
 * Extracts API key from Authorization header
 * Expected format: "Bearer rlk_..."
 */
function extractApiKey(request: NextRequest): string | null {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;

  const match = authHeader.match(/^Bearer\s+(rlk_[a-f0-9]{32})$/i);
  return match ? match[1] : null;
}

/**
 * Adds rate limit headers to response
 */
function addRateLimitHeaders(
  response: NextResponse,
  remaining: number,
  resetAt: Date,
  limit: number,
): NextResponse {
  response.headers.set("X-RateLimit-Limit", String(limit));
  response.headers.set("X-RateLimit-Remaining", String(remaining));
  response.headers.set(
    "X-RateLimit-Reset",
    String(Math.ceil(resetAt.getTime() / 1000)),
  );
  return response;
}

// Hardcoded dummy user for Phase 1
const DUMMY_USER_ID = "user_1";

/**
 * Wraps an API route handler with rate limiting
 *
 * If an API key is provided:
 * - Validates the key (returns 401 if invalid)
 * - Checks rate limit (returns 429 if exceeded)
 * - Adds rate limit headers to response
 *
 * If no API key is provided:
 * - Uses dummy user (Phase 1 behavior)
 * - No rate limiting applied
 */
export function withRateLimit(handler: RouteHandler) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const db = getDb();
    runMigrations(db);

    const plainKey = extractApiKey(request);

    // If no API key provided, use dummy user (Phase 1)
    if (!plainKey) {
      return handler({
        request,
        db,
        apiKey: null,
        userId: DUMMY_USER_ID,
      });
    }

    // Validate API key
    const apiKey = validateApiKey(db, plainKey);
    if (!apiKey) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    // Check rate limit
    const config = getRateLimitConfig();
    const rateLimitResult = checkRateLimit(db, apiKey.id, config);

    if (!rateLimitResult.allowed) {
      const retryAfterSeconds = Math.ceil(
        (rateLimitResult.retryAfterMs || 0) / 1000,
      );
      const response = NextResponse.json(
        {
          error: "Rate limit exceeded",
          retryAfter: retryAfterSeconds,
        },
        { status: 429 },
      );
      response.headers.set("Retry-After", String(retryAfterSeconds));
      return addRateLimitHeaders(
        response,
        0,
        rateLimitResult.resetAt,
        config.maxRequests,
      );
    }

    // Call the handler
    const response = await handler({
      request,
      db,
      apiKey,
      userId: apiKey.user_id,
    });

    // Add rate limit headers to successful responses
    return addRateLimitHeaders(
      response,
      rateLimitResult.remaining,
      rateLimitResult.resetAt,
      config.maxRequests,
    );
  };
}
