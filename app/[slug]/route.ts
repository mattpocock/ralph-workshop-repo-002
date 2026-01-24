import { NextRequest, NextResponse } from "next/server";
import { getDb, runMigrations } from "@/lib/db";
import { getLinkBySlug, isLinkExpired } from "@/lib/links";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const db = getDb();
  runMigrations(db);

  const link = getLinkBySlug(db, slug);

  // Link not found (or soft-deleted)
  if (!link) {
    return new NextResponse("Not Found", { status: 404 });
  }

  // Link expired
  if (isLinkExpired(link.expires_at)) {
    return new NextResponse("This link has expired", { status: 410 });
  }

  // TODO: Record click asynchronously (analytics - future task)

  // Redirect to destination
  return NextResponse.redirect(link.destination_url, 302);
}
