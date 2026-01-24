import { NextResponse } from "next/server";
import { getLinkById } from "@/lib/links";
import { removeTagFromLink } from "@/lib/link-tags";
import { withRateLimitParams } from "@/lib/api";

/**
 * DELETE /api/v1/links/:id/tags/:tagId - Remove a tag from a link
 */
export const DELETE = withRateLimitParams<{ id: string; tagId: string }>(
  async ({ db, userId, params }) => {
    try {
      const { id, tagId } = params;

      // Check if link exists and belongs to current user
      const link = getLinkById(db, id);
      if (!link || link.user_id !== userId) {
        return NextResponse.json({ error: "Link not found" }, { status: 404 });
      }

      const removed = removeTagFromLink(db, id, tagId);

      if (!removed) {
        return NextResponse.json(
          { error: "Tag not associated with this link" },
          { status: 404 },
        );
      }

      return new NextResponse(null, { status: 204 });
    } catch (error) {
      console.error("Error removing tag from link:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
);
