import { NextRequest, NextResponse } from "next/server";
import { getDb, runMigrations } from "@/lib/db";
import { getLinkById, type LinkResponse } from "@/lib/links";

// Hardcoded dummy user for Phase 1
const DUMMY_USER_ID = "user_1";

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

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
}
