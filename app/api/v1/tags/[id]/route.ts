import { NextResponse } from "next/server";
import { getTagById, softDeleteTag } from "@/lib/tags";
import { withRateLimitParams } from "@/lib/api";

export const DELETE = withRateLimitParams<{ id: string }>(
  async ({ db, userId, params }) => {
    try {
      const { id } = params;

      // Check if tag exists and belongs to user
      const tag = getTagById(db, id);
      if (!tag || tag.user_id !== userId) {
        return NextResponse.json({ error: "Tag not found" }, { status: 404 });
      }

      softDeleteTag(db, id);

      return new NextResponse(null, { status: 204 });
    } catch (error) {
      console.error("Error deleting tag:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
);
