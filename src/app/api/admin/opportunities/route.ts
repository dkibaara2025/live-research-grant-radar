import { NextResponse } from "next/server";
import {
  createManualOpportunity,
  listManualOpportunityRows,
  updateManualOpportunity,
} from "@/db/repository";
import { formatValidationError, manualOpportunitySchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET() {
  const items = await listManualOpportunityRows();

  return NextResponse.json({
    items,
    adminKeyConfigured: Boolean(process.env.ADMIN_KEY),
    productionWarning:
      process.env.NODE_ENV === "production" && !process.env.ADMIN_KEY
        ? "ADMIN_KEY is not configured; admin writes are open in production."
        : null,
  });
}

export async function POST(request: Request) {
  const auth = requireAdminKey(request);

  if (auth) {
    return auth;
  }

  const parsed = await parseManualOpportunityRequest(request);

  if ("response" in parsed) {
    return parsed.response;
  }

  const row = await createManualOpportunity(parsed.data);

  return NextResponse.json({ item: row }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = requireAdminKey(request);

  if (auth) {
    return auth;
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const id =
    body && typeof body === "object" && "id" in body && typeof body.id === "string"
      ? body.id
      : null;

  if (!id) {
    return NextResponse.json({ error: "Manual opportunity id is required." }, { status: 400 });
  }

  const parsed = manualOpportunitySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid manual opportunity.",
        issues: formatValidationError(parsed.error),
      },
      { status: 400 },
    );
  }

  const row = await updateManualOpportunity(id, parsed.data);

  return NextResponse.json({ item: row });
}

function requireAdminKey(request: Request) {
  const configuredKey = process.env.ADMIN_KEY;

  if (!configuredKey) {
    return null;
  }

  const suppliedKey = request.headers.get("x-admin-key");

  if (suppliedKey !== configuredKey) {
    return NextResponse.json({ error: "Invalid admin key." }, { status: 401 });
  }

  return null;
}

async function parseManualOpportunityRequest(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return {
      response: NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }),
    };
  }

  const parsed = manualOpportunitySchema.safeParse(body);

  if (!parsed.success) {
    return {
      response: NextResponse.json(
        {
          error: "Invalid manual opportunity.",
          issues: formatValidationError(parsed.error),
        },
        { status: 400 },
      ),
    };
  }

  return {
    data: parsed.data,
  };
}
