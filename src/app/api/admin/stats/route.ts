import { NextResponse } from "next/server";
import { getAdminStats } from "@/db/repository";

export const runtime = "nodejs";

export async function GET() {
  const stats = await getAdminStats();

  return NextResponse.json({
    stats,
    adminKeyConfigured: Boolean(process.env.ADMIN_KEY),
    productionWarning:
      process.env.NODE_ENV === "production" && !process.env.ADMIN_KEY
        ? "ADMIN_KEY is not configured; admin writes are open in production."
        : null,
  });
}
