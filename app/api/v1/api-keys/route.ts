import { NextRequest, NextResponse } from "next/server";
import { getDb, runMigrations } from "@/lib/db";
import {
  createApiKey,
  createApiKeySchema,
  getApiKeys,
  type CreateApiKeyResponse,
  type ListApiKeysResponse,
} from "@/lib/api-keys";
import { ZodError } from "zod";

// Hardcoded dummy user for Phase 1
const DUMMY_USER_ID = "user_1";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createApiKeySchema.parse(body);

    const db = getDb();
    runMigrations(db);

    const { apiKey, plainKey } = createApiKey(db, {
      userId: DUMMY_USER_ID,
      name: validated.name,
    });

    const response: CreateApiKeyResponse = {
      id: apiKey.id,
      name: apiKey.name,
      key: plainKey,
      createdAt: apiKey.created_at,
      lastUsedAt: apiKey.last_used_at,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }

    console.error("Error creating API key:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const db = getDb();
    runMigrations(db);

    const apiKeys = getApiKeys(db, DUMMY_USER_ID);

    const response: ListApiKeysResponse = {
      apiKeys: apiKeys.map((key) => ({
        id: key.id,
        name: key.name,
        createdAt: key.created_at,
        lastUsedAt: key.last_used_at,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error listing API keys:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
