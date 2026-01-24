import { NextRequest, NextResponse } from "next/server";
import {
  createLink,
  createLinkSchema,
  getLinks,
  listLinksQuerySchema,
  type LinkResponse,
  type ListLinksResponse,
} from "@/lib/links";
import { withRateLimit } from "@/lib/api";
import { ZodError } from "zod";

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

export const POST = withRateLimit(async ({ request, db, userId }) => {
  try {
    const body = await request.json();
    const validated = createLinkSchema.parse(body);

    const link = createLink(db, {
      userId,
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
});

export const GET = withRateLimit(async ({ request, db, userId }) => {
  try {
    const { searchParams } = new URL(request.url);
    const query = listLinksQuerySchema.parse({
      limit: searchParams.get("limit") ?? undefined,
      offset: searchParams.get("offset") ?? undefined,
      tag: searchParams.get("tag") ?? undefined,
    });

    const { links, total } = getLinks(db, {
      userId,
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
});
