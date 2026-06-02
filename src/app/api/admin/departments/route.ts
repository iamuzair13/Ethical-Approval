import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin, isAdministrator } from "@/lib/admin-auth";
import { createDepartment, listDepartments } from "@/lib/admin-repository";
import { logActivityFromRequest } from "@/lib/activity-log";

export async function GET(request: NextRequest) {
  const actor = await assertActiveAdmin(request);
  if (!actor || !isAdministrator(actor)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const includeInactive = request.nextUrl.searchParams.get("all") === "1";
  const facultyIdRaw = request.nextUrl.searchParams.get("facultyId");
  const facultyId = facultyIdRaw && /^\d+$/.test(facultyIdRaw) ? Number(facultyIdRaw) : undefined;

  const departments = await listDepartments({ includeInactive, facultyId });
  return NextResponse.json({ ok: true, departments });
}

type CreateDepartmentBody = {
  facultyId?: number;
  name?: string;
};

export async function POST(request: NextRequest) {
  const actor = await assertActiveAdmin(request);
  if (!actor || !isAdministrator(actor)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  let body: CreateDepartmentBody;
  try {
    body = (await request.json()) as CreateDepartmentBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body.facultyId !== "number" || !body.name?.trim()) {
    return NextResponse.json(
      { ok: false, error: "facultyId and name are required." },
      { status: 400 },
    );
  }

  try {
    const department = await createDepartment({ facultyId: body.facultyId, name: body.name });
    void logActivityFromRequest(request, {
      actionCode: "admin.department.create",
      targetType: "department",
      targetId: String(department.id),
      targetLabel: department.name,
      facultyId: body.facultyId,
    });
    return NextResponse.json({ ok: true, department });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to create department. It may already exist." },
      { status: 409 },
    );
  }
}
