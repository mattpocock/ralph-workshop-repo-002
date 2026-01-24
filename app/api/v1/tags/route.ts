import { NextRequest, NextResponse } from "next/server";
import { getDb, runMigrations } from "@/lib/db";
import {
  createTag,
  createTagSchema,
  getTags,
  type TagResponse,
  type ListTagsResponse,
} from "@/lib/tags";
import { ZodError } from "zod";

// Hardcoded dummy user for Phase 1
const DUMMY_USER_ID = "user_1";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createTagSchema.parse(body);

    const db = getDb();
    runMigrations(db);

    const tag = createTag(db, {
      userId: DUMMY_USER_ID,
      name: validated.name,
    });

    const response: TagResponse = {
      id: tag.id,
      name: tag.name,
      createdAt: tag.created_at,
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

    if (error instanceof Error) {
      if (error.message.includes("already exists")) {
        return NextResponse.json(
          { error: "A tag with this name already exists" },
          { status: 409 },
        );
      }
    }

    console.error("Error creating tag:", error);
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

    const tags = getTags(db, DUMMY_USER_ID);

    const response: ListTagsResponse = {
      tags: tags.map((tag) => ({
        id: tag.id,
        name: tag.name,
        createdAt: tag.created_at,
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error listing tags:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
