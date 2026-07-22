import { authOptions } from "@/lib/auth-options";
import { assertActiveAdmin, isAdministrator } from "@/lib/admin-auth";
import { listDepartments, listFaculties, listPrograms } from "@/lib/admin-repository";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

async function buildFacultyDepartmentsPayload() {
  const faculties = await listFaculties();
  const departments = await listDepartments();
  const programs = await listPrograms();

  const programMap = new Map<number, string[]>();
  for (const prog of programs) {
    const list = programMap.get(prog.department_id) ?? [];
    list.push(prog.name);
    programMap.set(prog.department_id, list);
  }

  const departmentMap = new Map<number, { name: string; programs: string[] }[]>();
  for (const row of departments) {
    const list = departmentMap.get(row.faculty_id) ?? [];
    list.push({
      name: row.name,
      programs: (programMap.get(row.id) ?? []).sort((a, b) => a.localeCompare(b)),
    });
    departmentMap.set(row.faculty_id, list);
  }

  return faculties.map((faculty) => ({
    id: faculty.id,
    name: faculty.name,
    departments: (departmentMap.get(faculty.id) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
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
