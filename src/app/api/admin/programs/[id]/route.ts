import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin, isAdministrator } from "@/lib/admin-auth";
import { deleteProgram, updateProgram } from "@/lib/admin-repository";
import { logActivityFromRequest } from "@/lib/activity-log";

type UpdateProgramBody = {
  departmentId?: number;
  name?: string;
  isActive?: boolean;
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const actor = await assertActiveAdmin(request);
  if (!actor || !isAdministrator(actor)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const { id } = await context.params;
  const programId = Number(id);
  if (!Number.isInteger(programId)) {
    return NextResponse.json({ ok: false, error: "Invalid program id." }, { status: 400 });
  }

  let body: UpdateProgramBody;
  try {
    body = (await request.json()) as UpdateProgramBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body.departmentId !== "number" || !body.name?.trim() || typeof body.isActive !== "boolean") {
    return NextResponse.json(
      { ok: false, error: "departmentId, name and isActive are required." },
      { status: 400 },
    );
  }

  try {
    const program = await updateProgram({
      id: programId,
      departmentId: body.departmentId,
      name: body.name,
      isActive: body.isActive,
    });
    if (!program) {
      return NextResponse.json({ ok: false, error: "Program not found." }, { status: 404 });
    }
    void logActivityFromRequest(request, {
      actionCode: "admin.program.update",
      targetType: "program",
      targetId: String(program.id),
      targetLabel: program.name,
    });
    return NextResponse.json({ ok: true, program });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to update program. It may already exist." },
      { status: 409 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const actor = await assertActiveAdmin(request);
  if (!actor || !isAdministrator(actor)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const { id } = await context.params;
  const programId = Number(id);
  if (!Number.isInteger(programId)) {
    return NextResponse.json({ ok: false, error: "Invalid program id." }, { status: 400 });
  }

  try {
    const deleted = await deleteProgram(programId);
    if (!deleted) {
      return NextResponse.json({ ok: false, error: "Program not found." }, { status: 404 });
    }
    void logActivityFromRequest(request, {
      actionCode: "admin.program.delete",
      targetType: "program",
      targetId: String(programId),
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Unable to delete program. It may be assigned to users; unassign first.",
      },
      { status: 409 },
    );
  }
}
