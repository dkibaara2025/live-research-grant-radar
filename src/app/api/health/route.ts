import { NextResponse } from "next/server";
import { pingDatabase } from "@/db/client";

export const runtime = "nodejs";

export async function GET() {
  const database = await pingDatabase();
  const llmConfigured = Boolean(process.env.GEMINI_API_KEY);
  const ok = !database.configured || database.ok;

  return NextResponse.json(
    {
      ok,
      service: "live-research-grant-radar",
      time: new Date().toISOString(),
      checks: {
        app: {
          ok: true,
        },
        database,
        llm: {
          configured: llmConfigured,
          ok: llmConfigured,
          model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
        },
      },
    },
    { status: ok ? 200 : 503 },
  );
}
