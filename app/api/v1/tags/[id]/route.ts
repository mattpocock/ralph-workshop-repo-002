import { NextRequest, NextResponse } from "next/server";
import { getDb, runMigrations } from "@/lib/db";
import { getTagById, softDeleteTag } from "@/lib/tags";

// Hardcoded dummy user for Phase 1
const DUMMY_USER_ID = "user_1";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const db = getDb();
    runMigrations(db);

    // Check if tag exists and belongs to user
    const tag = getTagById(db, id);
    if (!tag || tag.user_id !== DUMMY_USER_ID) {
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
}
