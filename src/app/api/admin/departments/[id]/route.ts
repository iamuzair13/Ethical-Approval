import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin, isAdministrator } from "@/lib/admin-auth";
import { deleteDepartment, updateDepartment } from "@/lib/admin-repository";

type UpdateDepartmentBody = {
  facultyId?: number;
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
  const departmentId = Number(id);
  if (!Number.isInteger(departmentId)) {
    return NextResponse.json({ ok: false, error: "Invalid department id." }, { status: 400 });
  }

  let body: UpdateDepartmentBody;
  try {
    body = (await request.json()) as UpdateDepartmentBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body.facultyId !== "number" || !body.name?.trim() || typeof body.isActive !== "boolean") {
    return NextResponse.json(
      { ok: false, error: "facultyId, name and isActive are required." },
      { status: 400 },
    );
  }

  try {
    const department = await updateDepartment({
      id: departmentId,
      facultyId: body.facultyId,
      name: body.name,
      isActive: body.isActive,
    });
    if (!department) {
      return NextResponse.json({ ok: false, error: "Department not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, department });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to update department. It may already exist." },
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
  const departmentId = Number(id);
  if (!Number.isInteger(departmentId)) {
    return NextResponse.json({ ok: false, error: "Invalid department id." }, { status: 400 });
  }

  try {
    const deleted = await deleteDepartment(departmentId);
    if (!deleted) {
      return NextResponse.json({ ok: false, error: "Department not found." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Unable to delete department. It may be assigned to users; unassign first.",
      },
      { status: 409 },
    );
  }
}
