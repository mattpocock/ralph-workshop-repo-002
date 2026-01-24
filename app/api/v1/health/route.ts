import { NextResponse } from "next/server";
import { getDb, runMigrations } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    runMigrations(db);

    // Simple query to verify database connectivity
    const result = db.prepare("SELECT 1 as ok").get() as { ok: number };

    if (result?.ok !== 1) {
      throw new Error("Database check failed");
    }

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check failed:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 },
    );
  }
}
