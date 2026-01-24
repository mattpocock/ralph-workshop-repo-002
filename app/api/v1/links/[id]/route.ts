import { NextResponse } from "next/server";
import {
  getLinkById,
  updateLink,
  updateLinkSchema,
  softDeleteLink,
  type LinkResponse,
} from "@/lib/links";
import {
  withRateLimitParams,
  type RateLimitedRequestWithParams,
} from "@/lib/api";

function getBaseUrl(
  request: RateLimitedRequestWithParams<{ id: string }>["request"],
): string {
  const host = request.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

export const GET = withRateLimitParams<{ id: string }>(
  async ({ request, db, userId, params }) => {
    try {
      const { id } = params;

      const link = getLinkById(db, id);

      if (!link) {
        return NextResponse.json({ error: "Link not found" }, { status: 404 });
      }

      // Verify the link belongs to the current user
      if (link.user_id !== userId) {
        return NextResponse.json({ error: "Link not found" }, { status: 404 });
      }

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

      return NextResponse.json(response);
    } catch (error) {
      console.error("Error fetching link:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
);

export const PATCH = withRateLimitParams<{ id: string }>(
  async ({ request, db, userId, params }) => {
    try {
      const { id } = params;
      const body = await request.json();

      const parsed = updateLinkSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0].message },
          { status: 400 },
        );
      }

      // Check if link exists and belongs to current user
      const existingLink = getLinkById(db, id);
      if (!existingLink) {
        return NextResponse.json({ error: "Link not found" }, { status: 404 });
      }

      if (existingLink.user_id !== userId) {
        return NextResponse.json({ error: "Link not found" }, { status: 404 });
      }

      const updatedLink = updateLink(db, id, {
        destinationUrl: parsed.data.destinationUrl,
        expiresAt: parsed.data.expiresAt,
      });

      if (!updatedLink) {
        return NextResponse.json({ error: "Link not found" }, { status: 404 });
      }

      const baseUrl = getBaseUrl(request);

      const response: LinkResponse = {
        id: updatedLink.id,
        slug: updatedLink.slug,
        destinationUrl: updatedLink.destination_url,
        shortUrl: `${baseUrl}/${updatedLink.slug}`,
        expiresAt: updatedLink.expires_at,
        createdAt: updatedLink.created_at,
        updatedAt: updatedLink.updated_at,
      };

      return NextResponse.json(response);
    } catch (error) {
      console.error("Error updating link:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
);

export const DELETE = withRateLimitParams<{ id: string }>(
  async ({ db, userId, params }) => {
    try {
      const { id } = params;

      // Check if link exists and belongs to current user
      const existingLink = getLinkById(db, id);
      if (!existingLink) {
        return NextResponse.json({ error: "Link not found" }, { status: 404 });
      }

      if (existingLink.user_id !== userId) {
        return NextResponse.json({ error: "Link not found" }, { status: 404 });
      }

      softDeleteLink(db, id);

      return new NextResponse(null, { status: 204 });
    } catch (error) {
      console.error("Error deleting link:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
);
