import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin, isAdministrator } from "@/lib/admin-auth";
import {
  assignDeanFaculty,
  assignIrebFaculties,
  getAdminUserById,
} from "@/lib/admin-repository";

type AssignFacultyBody = {
  adminUserId?: string;
  role?: "dean" | "ireb";
  facultyId?: number;
  facultyIds?: number[];
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
    if (typeof body.facultyId !== "number") {
      return NextResponse.json(
        { ok: false, error: "facultyId is required for dean assignment." },
        { status: 400 },
      );
    }
    await assignDeanFaculty({
      adminUserId: body.adminUserId,
      facultyId: body.facultyId,
      assignedBy: actor.adminId,
    });
    return NextResponse.json({ ok: true });
  }

  const facultyIds = Array.isArray(body.facultyIds) ? body.facultyIds : [];
  await assignIrebFaculties({
    adminUserId: body.adminUserId,
    facultyIds,
    assignedBy: actor.adminId,
  });
  return NextResponse.json({ ok: true, scopeMode: facultyIds.length ? "restricted" : "all" });
}
