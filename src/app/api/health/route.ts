import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({ status: "ok", db: "up" });
  } catch (error) {
    logger.error({ error }, "health check: database unreachable");
    return NextResponse.json({ status: "error", db: "down" }, { status: 503 });
  }
}
