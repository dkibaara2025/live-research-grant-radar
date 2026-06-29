import { NextResponse } from "next/server";
import { runRadar } from "@/lib/agent/run-radar";
import { formatValidationError, radarRequestSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "Invalid JSON body.",
      },
      { status: 400 },
    );
  }

  const parsed = radarRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid research profile.",
        issues: formatValidationError(parsed.error),
      },
      { status: 400 },
    );
  }

  const result = await runRadar(parsed.data.profile);

  return NextResponse.json(result);
}
