import { authOptions } from "@/lib/auth-options";
import { listDepartments, listFaculties } from "@/lib/admin-repository";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.sapId) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const faculties = await listFaculties();
  const departments = await listDepartments();
  const departmentMap = new Map<number, string[]>();
  for (const row of departments) {
    const list = departmentMap.get(row.faculty_id) ?? [];
    list.push(row.name);
    departmentMap.set(row.faculty_id, list);
  }

  const payload = faculties.map((faculty) => ({
    id: faculty.id,
    name: faculty.name,
    departments: (departmentMap.get(faculty.id) ?? []).sort((a, b) => a.localeCompare(b)),
  }));

  return NextResponse.json({ ok: true, faculties: payload });
}
