import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin, isAdministrator } from "@/lib/admin-auth";
import { deleteFaculty, updateFaculty } from "@/lib/admin-repository";

type UpdateFacultyBody = {
  code?: string;
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
  const facultyId = Number(id);
  if (!Number.isInteger(facultyId)) {
    return NextResponse.json({ ok: false, error: "Invalid faculty id." }, { status: 400 });
  }

  let body: UpdateFacultyBody;
  try {
    body = (await request.json()) as UpdateFacultyBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  if (!body.code?.trim() || !body.name?.trim() || typeof body.isActive !== "boolean") {
    return NextResponse.json(
      { ok: false, error: "code, name and isActive are required." },
      { status: 400 },
    );
  }

  try {
    const faculty = await updateFaculty({
      id: facultyId,
      code: body.code,
      name: body.name,
      isActive: body.isActive,
    });
    if (!faculty) {
      return NextResponse.json({ ok: false, error: "Faculty not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, faculty });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to update faculty. Code may already exist." },
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
  const facultyId = Number(id);
  if (!Number.isInteger(facultyId)) {
    return NextResponse.json({ ok: false, error: "Invalid faculty id." }, { status: 400 });
  }

  try {
    const deleted = await deleteFaculty(facultyId);
    if (!deleted) {
      return NextResponse.json({ ok: false, error: "Faculty not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Unable to delete faculty. It may be assigned to users; unassign first.",
      },
      { status: 409 },
    );
  }
}
