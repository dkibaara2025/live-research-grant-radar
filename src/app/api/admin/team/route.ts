import { NextResponse } from "next/server";
import {
  createTeamMember,
  deleteTeamMember,
  listTeamMemberRows,
  updateTeamMember,
} from "@/db/repository";
import { formatValidationError, teamMemberSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const items = await listTeamMemberRows(url.searchParams.get("q") ?? "");

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const auth = requireAdminKey(request);

  if (auth) {
    return auth;
  }

  const parsed = await parseRequest(request);

  if ("response" in parsed) {
    return parsed.response;
  }

  const item = await createTeamMember(parsed.data);

  return NextResponse.json({ item }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = requireAdminKey(request);

  if (auth) {
    return auth;
  }

  const body = await safeJson(request);
  const id =
    body && typeof body === "object" && "id" in body && typeof body.id === "string"
      ? body.id
      : null;

  if (!id) {
    return NextResponse.json({ error: "Team member id is required." }, { status: 400 });
  }

  const parsed = teamMemberSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid team member.",
        issues: formatValidationError(parsed.error),
      },
      { status: 400 },
    );
  }

  const item = await updateTeamMember(id, parsed.data);

  return NextResponse.json({ item });
}

export async function DELETE(request: Request) {
  const auth = requireAdminKey(request);

  if (auth) {
    return auth;
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Team member id is required." }, { status: 400 });
  }

  const deleted = await deleteTeamMember(id);

  return NextResponse.json({ deleted });
}

function requireAdminKey(request: Request) {
  const configuredKey = process.env.ADMIN_KEY;

  if (!configuredKey) {
    return null;
  }

  if (request.headers.get("x-admin-key") !== configuredKey) {
    return NextResponse.json({ error: "Invalid admin key." }, { status: 401 });
  }

  return null;
}

async function parseRequest(request: Request) {
  const body = await safeJson(request);

  if (!body) {
    return {
      response: NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }),
    };
  }

  const parsed = teamMemberSchema.safeParse(body);

  if (!parsed.success) {
    return {
      response: NextResponse.json(
        {
          error: "Invalid team member.",
          issues: formatValidationError(parsed.error),
        },
        { status: 400 },
      ),
    };
  }

  return { data: parsed.data };
}

async function safeJson(request: Request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
