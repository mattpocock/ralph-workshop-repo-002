import { NextResponse } from "next/server";
import {
  createTag,
  createTagSchema,
  getTags,
  type TagResponse,
  type ListTagsResponse,
} from "@/lib/tags";
import { withRateLimit } from "@/lib/api";
import { ZodError } from "zod";

export const POST = withRateLimit(async ({ request, db, userId }) => {
  try {
    const body = await request.json();
    const validated = createTagSchema.parse(body);

    const tag = createTag(db, {
      userId,
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
});

export const GET = withRateLimit(async ({ db, userId }) => {
  try {
    const tags = getTags(db, userId);

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
});
