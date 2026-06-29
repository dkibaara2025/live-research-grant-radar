import { NextResponse } from "next/server";
import { listSourceCache } from "@/db/repository";
import { fetchFundingSources } from "@/lib/funding/sources";

export const runtime = "nodejs";

export async function GET() {
  const cache = await listSourceCache();

  return NextResponse.json({
    cache,
    configuredFeeds: process.env.FUNDING_FEEDS ? "configured" : "not configured",
  });
}

export async function POST(request: Request) {
  const configuredKey = process.env.ADMIN_KEY;

  if (configuredKey && request.headers.get("x-admin-key") !== configuredKey) {
    return NextResponse.json({ error: "Invalid admin key." }, { status: 401 });
  }

  const result = await fetchFundingSources();

  return NextResponse.json(result);
}
