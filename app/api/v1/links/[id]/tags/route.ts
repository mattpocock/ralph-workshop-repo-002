import { NextResponse } from "next/server";
import { getLinkById } from "@/lib/links";
import { getTagById } from "@/lib/tags";
import {
  addTagToLink,
  getTagsForLink,
  setTagsForLink,
  addTagsToLinkSchema,
  setTagsForLinkSchema,
  type LinkTagsResponse,
} from "@/lib/link-tags";
import { withRateLimitParams } from "@/lib/api";

/**
 * GET /api/v1/links/:id/tags - Get all tags for a link
 */
export const GET = withRateLimitParams<{ id: string }>(
  async ({ db, userId, params }) => {
    try {
      const { id } = params;

      // Check if link exists and belongs to current user
      const link = getLinkById(db, id);
      if (!link || link.user_id !== userId) {
        return NextResponse.json({ error: "Link not found" }, { status: 404 });
      }

      const tags = getTagsForLink(db, id);

      const response: LinkTagsResponse = {
        tags: tags.map((tag) => ({
          id: tag.id,
          name: tag.name,
          createdAt: tag.created_at,
        })),
      };

      return NextResponse.json(response);
    } catch (error) {
      console.error("Error fetching link tags:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
);

/**
 * POST /api/v1/links/:id/tags - Add tags to a link
 */
export const POST = withRateLimitParams<{ id: string }>(
  async ({ request, db, userId, params }) => {
    try {
      const { id } = params;
      const body = await request.json();

      const parsed = addTagsToLinkSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0].message },
          { status: 400 },
        );
      }

      // Check if link exists and belongs to current user
      const link = getLinkById(db, id);
      if (!link || link.user_id !== userId) {
        return NextResponse.json({ error: "Link not found" }, { status: 404 });
      }

      // Verify all tags exist and belong to the current user
      for (const tagId of parsed.data.tagIds) {
        const tag = getTagById(db, tagId);
        if (!tag || tag.user_id !== userId) {
          return NextResponse.json(
            { error: `Tag not found: ${tagId}` },
            { status: 404 },
          );
        }
      }

      // Add tags to link
      for (const tagId of parsed.data.tagIds) {
        addTagToLink(db, id, tagId);
      }

      // Return updated tags list
      const tags = getTagsForLink(db, id);

      const response: LinkTagsResponse = {
        tags: tags.map((tag) => ({
          id: tag.id,
          name: tag.name,
          createdAt: tag.created_at,
        })),
      };

      return NextResponse.json(response, { status: 201 });
    } catch (error) {
      console.error("Error adding tags to link:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
);

/**
 * PUT /api/v1/links/:id/tags - Set (replace) all tags for a link
 */
export const PUT = withRateLimitParams<{ id: string }>(
  async ({ request, db, userId, params }) => {
    try {
      const { id } = params;
      const body = await request.json();

      const parsed = setTagsForLinkSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0].message },
          { status: 400 },
        );
      }

      // Check if link exists and belongs to current user
      const link = getLinkById(db, id);
      if (!link || link.user_id !== userId) {
        return NextResponse.json({ error: "Link not found" }, { status: 404 });
      }

      // Verify all tags exist and belong to the current user
      for (const tagId of parsed.data.tagIds) {
        const tag = getTagById(db, tagId);
        if (!tag || tag.user_id !== userId) {
          return NextResponse.json(
            { error: `Tag not found: ${tagId}` },
            { status: 404 },
          );
        }
      }

      // Replace all tags
      setTagsForLink(db, id, parsed.data.tagIds);

      // Return updated tags list
      const tags = getTagsForLink(db, id);

      const response: LinkTagsResponse = {
        tags: tags.map((tag) => ({
          id: tag.id,
          name: tag.name,
          createdAt: tag.created_at,
        })),
      };

      return NextResponse.json(response);
    } catch (error) {
      console.error("Error setting link tags:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
);
