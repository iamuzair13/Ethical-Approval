import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin, isAdministrator } from "@/lib/admin-auth";
import { intIdEq } from "@/lib/admin-report-faculty-dept-filters";
import { listDepartments, listFaculties } from "@/lib/admin-repository";

export async function GET(request: NextRequest) {
  const actor = await assertActiveAdmin(request);
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const restrictToFacultyIds =
    !isAdministrator(actor) &&
    actor.scopeMode === "restricted" &&
    actor.facultyIds.length > 0;

  const facultyIdFilter = restrictToFacultyIds ? actor.facultyIds : undefined;

  const allFaculties = await listFaculties();
  const faculties = facultyIdFilter
    ? allFaculties.filter((f) => facultyIdFilter.some((fid) => intIdEq(fid, f.id)))
    : allFaculties;

  const departments = await listDepartments(
    facultyIdFilter && facultyIdFilter.length > 0 ? { facultyIds: facultyIdFilter } : {},
  );

  return NextResponse.json({
    ok: true,
    faculties: faculties.map((f) => ({ id: Number(f.id), name: f.name })),
    departments: departments.map((d) => ({
      id: Number(d.id),
      name: d.name,
      facultyId: Number(d.faculty_id),
      facultyName: d.faculty_name,
    })),
  });
}
