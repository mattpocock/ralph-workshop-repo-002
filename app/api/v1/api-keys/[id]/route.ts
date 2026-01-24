import { NextRequest, NextResponse } from "next/server";
import { getDb, runMigrations } from "@/lib/db";
import { getApiKeyById, deleteApiKey } from "@/lib/api-keys";

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

    // Check if API key exists and belongs to user
    const apiKey = getApiKeyById(db, id);
    if (!apiKey || apiKey.user_id !== DUMMY_USER_ID) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    deleteApiKey(db, id);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting API key:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
