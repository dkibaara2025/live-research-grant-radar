import { NextResponse } from "next/server";
import {
  deleteTeamMember,
  getTeamMember,
  updateTeamMember,
} from "@/db/repository";
import { formatValidationError, teamMemberSchema } from "@/lib/validation";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const item = await getTeamMember(id);

  if (!item) {
    return NextResponse.json({ error: "Team member not found." }, { status: 404 });
  }

  return NextResponse.json({ item });
}

export async function PATCH(request: Request, context: RouteContext) {
  return update(request, context);
}

export async function PUT(request: Request, context: RouteContext) {
  return update(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = requireAdminKey(request);

  if (auth) {
    return auth;
  }

  const { id } = await context.params;
  const deleted = await deleteTeamMember(id);

  return NextResponse.json({ deleted });
}

async function update(request: Request, context: RouteContext) {
  const auth = requireAdminKey(request);

  if (auth) {
    return auth;
  }

  const parsed = await parseTeamMemberRequest(request);

  if ("response" in parsed) {
    return parsed.response;
  }

  const { id } = await context.params;
  const item = await updateTeamMember(id, parsed.data);

  if (!item) {
    return NextResponse.json({ error: "Team member not found." }, { status: 404 });
  }

  return NextResponse.json({ item });
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
