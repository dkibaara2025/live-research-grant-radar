import { NextResponse } from "next/server";
import { listRadarRuns } from "@/db/repository";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = url.searchParams.get("q") ?? "";
  const result = await listRadarRuns(search);

  return NextResponse.json(result);
}
