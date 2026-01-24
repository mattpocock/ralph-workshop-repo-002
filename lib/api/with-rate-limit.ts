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
export interface RateLimitedRequestWithParams<P> {
  request: NextRequest;
  db: Database.Database;
  apiKey: ApiKey | null;
  userId: string;
  params: P;
}

type RouteHandlerWithParams<P> = (
  context: RateLimitedRequestWithParams<P>,
) => Promise<NextResponse> | NextResponse;

/**
 * Core rate limiting logic - extracted to share between variants
 */
async function handleRateLimit(
  request: NextRequest,
): Promise<
  | {
      allowed: true;
      db: Database.Database;
      apiKey: ApiKey | null;
      userId: string;
      addHeaders: (response: NextResponse) => NextResponse;
    }
  | { allowed: false; response: NextResponse }
> {
  const db = getDb();
  runMigrations(db);

  const plainKey = extractApiKey(request);

  // If no API key provided, use dummy user (Phase 1)
  if (!plainKey) {
    return {
      allowed: true,
      db,
      apiKey: null,
      userId: DUMMY_USER_ID,
      addHeaders: (response) => response,
    };
  }

  // Validate API key
  const apiKey = validateApiKey(db, plainKey);
  if (!apiKey) {
    return {
      allowed: false,
      response: NextResponse.json(
        { error: "Invalid API key" },
        { status: 401 },
      ),
    };
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
    return {
      allowed: false,
      response: addRateLimitHeaders(
        response,
        0,
        rateLimitResult.resetAt,
        config.maxRequests,
      ),
    };
  }

  return {
    allowed: true,
    db,
    apiKey,
    userId: apiKey.user_id,
    addHeaders: (response) =>
      addRateLimitHeaders(
        response,
        rateLimitResult.remaining,
        rateLimitResult.resetAt,
        config.maxRequests,
      ),
  };
}

export function withRateLimit(handler: RouteHandler) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const result = await handleRateLimit(request);

    if (!result.allowed) {
      return result.response;
    }

    const response = await handler({
      request,
      db: result.db,
      apiKey: result.apiKey,
      userId: result.userId,
    });

    return result.addHeaders(response);
  };
}

/**
 * Wraps an API route handler with rate limiting - variant for routes with params
 *
 * Usage:
 * export const GET = withRateLimitParams<{ id: string }>(async ({ request, db, userId, params }) => {
 *   const { id } = params;
 *   // ...
 * });
 */
export function withRateLimitParams<P>(handler: RouteHandlerWithParams<P>) {
  return async (
    request: NextRequest,
    { params }: { params: Promise<P> },
  ): Promise<NextResponse> => {
    const result = await handleRateLimit(request);

    if (!result.allowed) {
      return result.response;
    }

    const resolvedParams = await params;

    const response = await handler({
      request,
      db: result.db,
      apiKey: result.apiKey,
      userId: result.userId,
      params: resolvedParams,
    });

    return result.addHeaders(response);
  };
}
