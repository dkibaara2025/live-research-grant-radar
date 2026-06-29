import { NextResponse } from "next/server";
import { listSavedOpportunities, saveRadarRun } from "@/db/repository";
import {
  formatValidationError,
  saveOpportunityRequestSchema,
} from "@/lib/validation";

export const runtime = "nodejs";

export async function GET() {
  const result = await listSavedOpportunities();

  return NextResponse.json(result);
}

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

  const parsed = saveOpportunityRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid saved opportunity payload.",
        issues: formatValidationError(parsed.error),
      },
      { status: 400 },
    );
  }

  const result = await saveRadarRun(parsed.data.profile, [parsed.data.match]);

  return NextResponse.json(result, { status: result.saved ? 201 : 202 });
}
