import { NextRequest, NextResponse } from "next/server";
import { getDb, runMigrations } from "@/lib/db";
import { getLinkById } from "@/lib/links";
import { getClickStats } from "@/lib/click-analytics";

// Hardcoded dummy user for Phase 1
const DUMMY_USER_ID = "user_1";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const db = getDb();
    runMigrations(db);

    const link = getLinkById(db, id);

    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    // Verify the link belongs to the current user
    if (link.user_id !== DUMMY_USER_ID) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    const stats = getClickStats(db, id);

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching link stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
