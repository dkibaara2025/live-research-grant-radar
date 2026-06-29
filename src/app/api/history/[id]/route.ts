import { NextResponse } from "next/server";
import { deleteRadarRun, getRadarRun } from "@/db/repository";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const run = await getRadarRun(id);

  if (!run) {
    return NextResponse.json({ error: "History run not found." }, { status: 404 });
  }

  return NextResponse.json({ item: run });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const deleted = await deleteRadarRun(id);

  return NextResponse.json({ deleted });
}
