import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin, isAdministrator } from "@/lib/admin-auth";
import {
  assignDeanFaculty,
  assignIrebFaculties,
  getAdminUserById,
} from "@/lib/admin-repository";
import { db } from "@/lib/db";

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
    return NextResponse.json({ ok: true });
  }

  const departmentIds = Array.isArray(body.departmentIds) ? body.departmentIds : [];
  let assignments: { facultyId: number; departmentId: number }[] = [];
  if (departmentIds.length > 0) {
    const mapped = await db.query<{ id: number; faculty_id: number }>(
      `
        SELECT id, faculty_id
        FROM departments
        WHERE id = ANY($1::bigint[])
      `,
      [departmentIds],
    );
    assignments = mapped.rows.map((row) => ({
      facultyId: row.faculty_id,
      departmentId: row.id,
    }));
  }
  await assignIrebFaculties({
    adminUserId: body.adminUserId,
    assignments,
    assignedBy: actor.adminId,
  });
  return NextResponse.json({ ok: true, scopeMode: assignments.length ? "restricted" : "all" });
}
