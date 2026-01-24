import { NextResponse } from "next/server";
import {
  createApiKey,
  createApiKeySchema,
  getApiKeys,
  type CreateApiKeyResponse,
  type ListApiKeysResponse,
} from "@/lib/api-keys";
import { withRateLimit } from "@/lib/api";
import { ZodError } from "zod";

export const POST = withRateLimit(async ({ request, db, userId }) => {
  try {
    const body = await request.json();
    const validated = createApiKeySchema.parse(body);

    const { apiKey, plainKey } = createApiKey(db, {
      userId,
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
});

export const GET = withRateLimit(async ({ db, userId }) => {
  try {
    const apiKeys = getApiKeys(db, userId);

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
});
