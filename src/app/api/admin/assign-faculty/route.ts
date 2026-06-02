import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin, isAdministrator } from "@/lib/admin-auth";
import {
  applyIrebScope,
  assignDeanFaculty,
  getAdminUserById,
} from "@/lib/admin-repository";
import { logActivityFromRequest } from "@/lib/activity-log";

type AssignFacultyBody = {
  adminUserId?: string;
  role?: "dean" | "ireb";
  facultyId?: number;
  facultyIds?: number[];
  departmentId?: number;
  departmentIds?: number[];
};

export async function POST(request: NextRequest) {
  const actor = await assertActiveAdmin(request);
  if (!actor || !isAdministrator(actor)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  let body: AssignFacultyBody;
  try {
    body = (await request.json()) as AssignFacultyBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  if (!body.adminUserId || !body.role) {
    return NextResponse.json(
      { ok: false, error: "adminUserId and role are required." },
      { status: 400 },
    );
  }

  const target = await getAdminUserById(body.adminUserId);
  if (!target) {
    return NextResponse.json({ ok: false, error: "Admin user not found." }, { status: 404 });
  }

  if (body.role === "dean") {
    if (typeof body.facultyId !== "number" || typeof body.departmentId !== "number") {
      return NextResponse.json(
        { ok: false, error: "facultyId and departmentId are required for dean assignment." },
        { status: 400 },
      );
    }
    await assignDeanFaculty({
      adminUserId: body.adminUserId,
      facultyId: body.facultyId,
      departmentId: body.departmentId,
      assignedBy: actor.adminId,
    });
    void logActivityFromRequest(request, {
      actionCode: "admin.faculty.assign_dean",
      targetType: "dean",
      targetId: body.adminUserId,
      targetLabel: target.name,
      facultyId: body.facultyId,
      effective: {
        adminId: target.id,
        name: target.name,
        role: target.role,
      },
    });
    return NextResponse.json({ ok: true });
  }

  const facultyIds = Array.isArray(body.facultyIds) ? body.facultyIds : [];
  await applyIrebScope({
    adminUserId: body.adminUserId,
    facultyIds,
    assignedBy: actor.adminId,
  });
  void logActivityFromRequest(request, {
    actionCode:
      facultyIds.length > 0 ? "admin.faculty.assign_ireb" : "admin.faculty.remove_ireb",
    targetType: "ireb_member",
    targetId: body.adminUserId,
    targetLabel: target.name,
    effective: {
      adminId: target.id,
      name: target.name,
      role: target.role,
    },
    metadata: { facultyIds },
  });
  const scopeMode = facultyIds.length > 0 ? "restricted" : "all";
  return NextResponse.json({ ok: true, scopeMode });
}
