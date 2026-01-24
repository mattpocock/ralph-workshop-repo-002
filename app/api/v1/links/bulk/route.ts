import { NextRequest, NextResponse } from "next/server";
import {
  bulkCreateLinks,
  bulkCreateLinksSchema,
  type BulkCreateLinksResponse,
  type LinkResponse,
} from "@/lib/links";
import { withRateLimit } from "@/lib/api";
import { ZodError } from "zod";

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

export const POST = withRateLimit(async ({ request, db, userId }) => {
  try {
    const body = await request.json();
    const validated = bulkCreateLinksSchema.parse(body);

    const results = bulkCreateLinks(
      db,
      userId,
      validated.links.map((link) => ({
        userId,
        destinationUrl: link.destinationUrl,
        slug: link.slug,
        expiresAt: link.expiresAt,
      })),
    );

    const baseUrl = getBaseUrl(request);

    const response: BulkCreateLinksResponse = {
      results: results.map((result) => ({
        index: result.index,
        success: result.success,
        link: result.link
          ? ({
              id: result.link.id,
              slug: result.link.slug,
              destinationUrl: result.link.destination_url,
              shortUrl: `${baseUrl}/${result.link.slug}`,
              expiresAt: result.link.expires_at,
              createdAt: result.link.created_at,
              updatedAt: result.link.updated_at,
            } as LinkResponse)
          : undefined,
        error: result.error,
      })),
      summary: {
        total: results.length,
        succeeded: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      },
    };

    // Return 207 Multi-Status if there are partial failures, 201 if all succeeded
    const status =
      response.summary.failed > 0 && response.summary.succeeded > 0
        ? 207
        : response.summary.failed === response.summary.total
          ? 400
          : 201;

    return NextResponse.json(response, { status });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
        { status: 400 },
      );
    }

    console.error("Error bulk creating links:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
});
