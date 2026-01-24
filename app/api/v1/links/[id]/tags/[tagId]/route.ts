import { NextRequest, NextResponse } from "next/server";
import { getDb, runMigrations } from "@/lib/db";
import { getLinkById } from "@/lib/links";
import { removeTagFromLink } from "@/lib/link-tags";

// Hardcoded dummy user for Phase 1
const DUMMY_USER_ID = "user_1";

/**
 * DELETE /api/v1/links/:id/tags/:tagId - Remove a tag from a link
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tagId: string }> },
) {
  try {
    const { id, tagId } = await params;

    const db = getDb();
    runMigrations(db);

    // Check if link exists and belongs to current user
    const link = getLinkById(db, id);
    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    if (link.user_id !== DUMMY_USER_ID) {
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
}
