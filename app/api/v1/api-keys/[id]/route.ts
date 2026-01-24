import { NextResponse } from "next/server";
import { getApiKeyById, deleteApiKey } from "@/lib/api-keys";
import { withRateLimitParams } from "@/lib/api";

export const DELETE = withRateLimitParams<{ id: string }>(
  async ({ db, userId, params }) => {
    try {
      const { id } = params;

      // Check if API key exists and belongs to user
      const apiKey = getApiKeyById(db, id);
      if (!apiKey || apiKey.user_id !== userId) {
        return NextResponse.json(
          { error: "API key not found" },
          { status: 404 },
        );
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
  },
);
