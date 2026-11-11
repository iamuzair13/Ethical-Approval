import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth-options";
import { adminFromSession, isAdministrator } from "@/lib/admin-auth";
import { getDashboardSummary, type TrackKey } from "@/lib/dashboard-summary";
import { listDepartments, listFaculties, listPrograms } from "@/lib/admin-repository";
import { intIdEq } from "@/lib/admin-report-faculty-dept-filters";
import { DashboardBoard } from "@/components/dashboard/dashboard-board";
import {
  defaultFilterState,
  type DashboardFilterState,
  type FilterOptions,
} from "@/components/dashboard/types";
import { getDashboardLeads } from "./fetch";
import DashboardApiProbe from "@/components/debug/dashboard-api-probe";

type PropsType = {
  searchParams: Promise<{
    from?: string;
    to?: string;
    facultyId?: string;
    departmentId?: string;
    programId?: string;
    track?: string;
  }>;
};

function parseIntParam(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

function parseIsoDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : value;
}

const VALID_TRACKS: TrackKey[] = [
  "student_thesis",
  "student_publication",
  "faculty_publication",
];

export default async function Home({ searchParams }: PropsType) {
  const params = await searchParams;
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.adminId || !session.user?.adminRole) {
    redirect("/auth/sign-in?callbackUrl=/");
  }

  const admin = adminFromSession(session);
  if (!admin) {
    redirect("/auth/sign-in?callbackUrl=/");
  }

  const defaults = defaultFilterState();
  const initialFilters: DashboardFilterState = {
    preset: params.from || params.to ? "custom" : defaults.preset,
    from: parseIsoDate(params.from) ?? defaults.from,
    to: parseIsoDate(params.to) ?? defaults.to,
    facultyId: parseIntParam(params.facultyId),
    departmentId: parseIntParam(params.departmentId),
    programId: parseIntParam(params.programId),
    track: VALID_TRACKS.includes(params.track as TrackKey)
      ? (params.track as TrackKey)
      : undefined,
  };

  // Filter options restricted to the viewer's faculty scope (same rule as
  // /api/admin/reports/report-filters).
  const restrictToFacultyIds =
    !isAdministrator(admin) && admin.scopeMode === "restricted" && admin.facultyIds.length > 0;
  const facultyIdFilter = restrictToFacultyIds ? admin.facultyIds : undefined;

  const [summary, filterOptions, leadsData] = await Promise.all([
    getDashboardSummary(admin, initialFilters),
    (async (): Promise<FilterOptions> => {
      const allFaculties = await listFaculties();
      const faculties = facultyIdFilter
        ? allFaculties.filter((f) => facultyIdFilter.some((fid) => intIdEq(fid, f.id)))
        : allFaculties;
      const departments = await listDepartments(
        facultyIdFilter && facultyIdFilter.length > 0 ? { facultyIds: facultyIdFilter } : {},
      );
      const programs = await listPrograms(
        departments.length > 0 ? { departmentIds: departments.map((d) => Number(d.id)) } : {},
      );
      return {
        faculties: faculties.map((f) => ({ id: Number(f.id), name: f.name })),
        departments: departments.map((d) => ({
          id: Number(d.id),
          name: d.name,
          facultyId: Number(d.faculty_id),
          facultyName: d.faculty_name ?? "",
        })),
        programs: programs.map((p) => ({
          id: Number(p.id),
          name: p.name,
          departmentId: Number(p.department_id),
          departmentName: p.department_name,
        })),
      };
    })(),
    getDashboardLeads(session),
  ]);

  // Sensitive cases are visible only to Administrators and IREB members.
  const role = session.user.adminRole;
  const canViewSensitive = role === "administrator" || role === "ireb";
  const sensitiveLeads = canViewSensitive
    ? leadsData.filter((lead) => lead.isSensitive)
    : [];

  return (
    <>
      <DashboardApiProbe tag="home" />
      <DashboardBoard
        initialSummary={summary}
        initialFilters={initialFilters}
        filterOptions={filterOptions}
        leads={leadsData}
        sensitiveLeads={sensitiveLeads}
        currentRole={role ?? null}
        canViewSensitive={canViewSensitive}
      />
    </>
  );
}
