import { authOptions } from "@/lib/auth-options";
import { assertActiveAdmin, isAdministrator } from "@/lib/admin-auth";
import { listDepartments, listFaculties } from "@/lib/admin-repository";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

async function buildFacultyDepartmentsPayload() {
  const faculties = await listFaculties();
  const departments = await listDepartments();
  const departmentMap = new Map<number, string[]>();
  for (const row of departments) {
    const list = departmentMap.get(row.faculty_id) ?? [];
    list.push(row.name);
    departmentMap.set(row.faculty_id, list);
  }

  return faculties.map((faculty) => ({
    id: faculty.id,
    name: faculty.name,
    departments: (departmentMap.get(faculty.id) ?? []).sort((a, b) => a.localeCompare(b)),
  }));
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const isStudent = Boolean(session?.user?.sapId);
  const admin = await assertActiveAdmin(request);
  const isAdmin = Boolean(admin && isAdministrator(admin));

  if (!isStudent && !isAdmin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const payload = await buildFacultyDepartmentsPayload();
  return NextResponse.json({ ok: true, faculties: payload });
}
