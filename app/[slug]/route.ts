import { NextRequest, NextResponse } from "next/server";
import { getDb, runMigrations } from "@/lib/db";
import { getLinkBySlug, isLinkExpired } from "@/lib/links";
import { recordClick } from "@/lib/click-analytics";

/**
 * Extract referrer domain from the Referer header
 */
function extractReferrerDomain(referer: string | null): string | null {
  if (!referer) return null;
  try {
    const url = new URL(referer);
    return url.hostname;
  } catch {
    return null;
  }
}

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

  // Record click (non-blocking - errors don't affect redirect)
  try {
    const referer = request.headers.get("referer");
    recordClick(db, {
      linkId: link.id,
      referrerDomain: extractReferrerDomain(referer),
      // TODO: Add geo lookup (ip-api.com) and user-agent parsing (ua-parser-js) in future task
    });
  } catch (error) {
    // Log but don't fail the redirect
    console.error("Failed to record click:", error);
  }

  // Redirect to destination
  return NextResponse.redirect(link.destination_url, 302);
}
