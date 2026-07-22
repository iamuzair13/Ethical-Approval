import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin, isAdministrator } from "@/lib/admin-auth";
import { createProgram, listPrograms } from "@/lib/admin-repository";
import { logActivityFromRequest } from "@/lib/activity-log";

export async function GET(request: NextRequest) {
  const actor = await assertActiveAdmin(request);
  if (!actor || !isAdministrator(actor)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const includeInactive = request.nextUrl.searchParams.get("all") === "1";
  const departmentIdRaw = request.nextUrl.searchParams.get("departmentId");
  const departmentId =
    departmentIdRaw && /^\d+$/.test(departmentIdRaw) ? Number(departmentIdRaw) : undefined;

  const programs = await listPrograms({ includeInactive, departmentId });
  return NextResponse.json({ ok: true, programs });
}

type CreateProgramBody = {
  departmentId?: number;
  name?: string;
};

export async function POST(request: NextRequest) {
  const actor = await assertActiveAdmin(request);
  if (!actor || !isAdministrator(actor)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  let body: CreateProgramBody;
  try {
    body = (await request.json()) as CreateProgramBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body.departmentId !== "number" || !body.name?.trim()) {
    return NextResponse.json(
      { ok: false, error: "departmentId and name are required." },
      { status: 400 },
    );
  }

  try {
    const program = await createProgram({ departmentId: body.departmentId, name: body.name });
    void logActivityFromRequest(request, {
      actionCode: "admin.program.create",
      targetType: "program",
      targetId: String(program.id),
      targetLabel: program.name,
    });
    return NextResponse.json({ ok: true, program });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to create program. It may already exist." },
      { status: 409 },
    );
  }
}
