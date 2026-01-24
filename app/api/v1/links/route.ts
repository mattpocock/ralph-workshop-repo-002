import { NextRequest, NextResponse } from "next/server";
import { getDb, runMigrations } from "@/lib/db";
import {
  createLink,
  createLinkSchema,
  getLinks,
  listLinksQuerySchema,
  type LinkResponse,
  type ListLinksResponse,
} from "@/lib/links";
import { ZodError } from "zod";

// Hardcoded dummy user for Phase 1
const DUMMY_USER_ID = "user_1";

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = createLinkSchema.parse(body);

    const db = getDb();
    runMigrations(db);

    const link = createLink(db, {
      userId: DUMMY_USER_ID,
      destinationUrl: validated.destinationUrl,
      slug: validated.slug,
      expiresAt: validated.expiresAt,
    });

    const baseUrl = getBaseUrl(request);

    const response: LinkResponse = {
      id: link.id,
      slug: link.slug,
      destinationUrl: link.destination_url,
      shortUrl: `${baseUrl}/${link.slug}`,
      expiresAt: link.expires_at,
      createdAt: link.created_at,
      updatedAt: link.updated_at,
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
          { error: "A link with this slug already exists" },
          { status: 409 },
        );
      }
    }

    console.error("Error creating link:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = listLinksQuerySchema.parse({
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
      tag: searchParams.get("tag") ?? undefined,
    });

    const db = getDb();
    runMigrations(db);

    const { links, total } = getLinks(db, {
      userId: DUMMY_USER_ID,
      limit: query.limit,
      offset: query.offset,
      tagId: query.tag,
    });

    const baseUrl = getBaseUrl(request);

    const response: ListLinksResponse = {
      links: links.map((link) => ({
        id: link.id,
        slug: link.slug,
        destinationUrl: link.destination_url,
        shortUrl: `${baseUrl}/${link.slug}`,
        expiresAt: link.expires_at,
        createdAt: link.created_at,
        updatedAt: link.updated_at,
      })),
      pagination: {
        total,
        limit: query.limit,
        offset: query.offset,
        hasMore: query.offset + links.length < total,
      },
    };

    return NextResponse.json(response);
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

    console.error("Error listing links:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
