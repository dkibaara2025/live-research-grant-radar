import { NextResponse } from "next/server";
import { createTeamMember, listTeamMembers } from "@/db/repository";
import { formatValidationError, teamMemberSchema } from "@/lib/validation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const items = await listTeamMembers(url.searchParams.get("q") ?? "");

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const auth = requireAdminKey(request);

  if (auth) {
    return auth;
  }

  const parsed = await parseTeamMemberRequest(request);

  if ("response" in parsed) {
    return parsed.response;
  }

  const item = await createTeamMember(parsed.data);

  return NextResponse.json({ item }, { status: 201 });
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

async function parseTeamMemberRequest(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
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
