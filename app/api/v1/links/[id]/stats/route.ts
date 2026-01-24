import { NextResponse } from "next/server";
import { getLinkById } from "@/lib/links";
import { getClickStats } from "@/lib/click-analytics";
import { withRateLimitParams } from "@/lib/api";

export const GET = withRateLimitParams<{ id: string }>(
  async ({ db, userId, params }) => {
    try {
      const { id } = params;

      const link = getLinkById(db, id);

      if (!link) {
        return NextResponse.json({ error: "Link not found" }, { status: 404 });
      }

      // Verify the link belongs to the current user
      if (link.user_id !== userId) {
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
  },
);
