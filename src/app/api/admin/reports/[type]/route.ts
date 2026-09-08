import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin, isAdministrator, type AuthenticatedAdmin } from "@/lib/admin-auth";
import type { AdminScope, AdminUserRecord } from "@/lib/admin-rbac";
import {
  buildOverallResearchSpecificReportHtml,
  buildTotalEfficiencyReportHtml,
  type AggregateReportContext,
} from "@/lib/admin-aggregate-reports-html";
import { buildHodReportHtml } from "@/lib/admin-hod-report-html";
import {
  buildDepartmentWiseResearchReportHtml,
  buildFacultyWiseResearchReportHtml,
} from "@/lib/admin-faculty-dept-research-report-html";
import { buildOverallFacultyReportHtml, isFacultyStaffPublicationRow } from "@/lib/admin-faculty-overall-report-html";
import {
  filterReportRowsByDepartmentId,
  filterReportRowsByMasterFacultyId,
  getDepartmentRow,
  intIdEq,
} from "@/lib/admin-report-faculty-dept-filters";
import { buildOverallStudentReportHtml, isStudentCohortRow } from "@/lib/admin-student-overall-report-html";
import {
  classifyHodRejectionReasonStated,
  fetchFacultyNamesForIds,
  fetchInstitutionNonDraftSubmissionCount,
} from "@/lib/admin-hod-report-queries";
import { getAdminUserById, getAdminScope, listFaculties } from "@/lib/admin-repository";
import { fetchReportSubmissionRows, filterReportRowsByScope } from "@/lib/admin-report-queries";
import { logActivityFromRequest } from "@/lib/activity-log";

const REPORT_TYPES = new Set([
  "hods-report",
  "total-efficiency",
  "overall-research-specific",
  "overall-student",
  "overall-faculty",
  "faculty-wise-research",
  "department-wise-research",
]);

type Body = {
  hodId?: string | null;
  /** ISO calendar date `YYYY-MM-DD` (local interpretation on server). */
  hodReportDateFrom?: string | null;
  hodReportDateTo?: string | null;
  /** Date window for non-hod reports. */
  reportDateFrom?: string | null;
  reportDateTo?: string | null;
  facultyId?: number | null;
  departmentId?: number | null;
};

function formatDateRangeLabel(from: Date, to: Date): string {
  return `${from.toLocaleDateString(undefined, { dateStyle: "medium" })} – ${to.toLocaleDateString(undefined, { dateStyle: "medium" })}`;
}

/** Accepts JSON number or string (e.g. from clients); BIGINT-safe positive id. */
function parsePositiveIntId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const n = Math.floor(value);
    return n > 0 ? n : null;
  }
  if (typeof value === "string" && value.trim()) {
    const n = Number.parseInt(value.trim(), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  return null;
}

function parseYmdString(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, mo, d] = s.split("-").map((x) => Number.parseInt(x, 10));
  const dt = new Date(y, mo - 1, d, 12, 0, 0, 0);
  if (
    Number.isNaN(dt.getTime()) ||
    dt.getFullYear() !== y ||
    dt.getMonth() !== mo - 1 ||
    dt.getDate() !== d
  ) {
    return null;
  }
  return s;
}

function ymdToLocalStartOfDay(ymd: string): Date {
  const [y, mo, d] = ymd.split("-").map((x) => Number.parseInt(x, 10));
  return new Date(y, mo - 1, d, 0, 0, 0, 0);
}

function ymdToLocalEndOfDay(ymd: string): Date {
  const [y, mo, d] = ymd.split("-").map((x) => Number.parseInt(x, 10));
  return new Date(y, mo - 1, d, 23, 59, 59, 999);
}

/** Synthetic admin for faculty snapshot checks (never role administrator). */
function scopeCheckAdmin(scope: { scopeMode: "all" | "restricted"; facultyIds: number[] }): AuthenticatedAdmin {
  return {
    adminId: "00000000-0000-0000-0000-000000000001",
    role: "hod",
    status: "active",
    scopeMode: scope.scopeMode,
    facultyIds: scope.facultyIds,
    tokenVersion: 0,
  };
}

function scopeDescriptionForCatalog(
  actor: AuthenticatedAdmin,
  institutionWide: boolean,
  hodReport: boolean,
): string {
  if (institutionWide) {
    return "All faculties — institution-wide";
  }
  if (hodReport) {
    if (actor.scopeMode === "all" || actor.facultyIds.length === 0) {
      return "HOD primary assignment (no faculty id resolved — verify assignments)";
    }
    return `HOD primary faculty scope (${actor.facultyIds.length} id(s))`;
  }
  if (actor.scopeMode === "all") {
    return "All assigned faculties (broad scope)";
  }
  if (actor.facultyIds.length === 0) {
    return "No faculty scope assigned on your account";
  }
  return `Restricted to ${actor.facultyIds.length} faculty record(s) on your account`;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ type: string }> },
) {
  const actor = await assertActiveAdmin(request);
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { type: rawType } = await context.params;
  const reportType = rawType?.trim() ?? "";
  if (!REPORT_TYPES.has(reportType)) {
    return NextResponse.json({ ok: false, error: "Unknown report type." }, { status: 404 });
  }

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    body = {};
  }

  if (reportType === "hods-report" && actor.role === "ireb") {
    return NextResponse.json(
      { ok: false, error: "This report is not available for IREB accounts." },
      { status: 403 },
    );
  }

  const hodIdRaw = typeof body.hodId === "string" ? body.hodId.trim() : "";
  if (hodIdRaw && reportType !== "hods-report") {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  if (reportType === "hods-report" && isAdministrator(actor) && !hodIdRaw) {
    return NextResponse.json(
      { ok: false, error: "Select a hod to generate this report." },
      { status: 400 },
    );
  }

  if (!isAdministrator(actor) && hodIdRaw && hodIdRaw !== actor.adminId) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  if (reportType !== "hods-report") {
    const hasHodFrom =
      body.hodReportDateFrom != null && String(body.hodReportDateFrom).trim() !== "";
    const hasHodTo =
      body.hodReportDateTo != null && String(body.hodReportDateTo).trim() !== "";
    if (hasHodFrom || hasHodTo) {
      return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
    }
  }

  let reportDateFromParsed: Date | null = null;
  let reportDateToParsed: Date | null = null;
  if (reportType !== "hods-report") {
    const hasReportFrom = body.reportDateFrom != null && String(body.reportDateFrom).trim() !== "";
    const hasReportTo = body.reportDateTo != null && String(body.reportDateTo).trim() !== "";
    if (!hasReportFrom || !hasReportTo) {
      return NextResponse.json(
        { ok: false, error: "Select both start and end dates for the report range." },
        { status: 400 },
      );
    }
    const fromStr = parseYmdString(body.reportDateFrom);
    const toStr = parseYmdString(body.reportDateTo);
    if (!fromStr || !toStr) {
      return NextResponse.json(
        { ok: false, error: "Invalid report date range." },
        { status: 400 },
      );
    }
    reportDateFromParsed = ymdToLocalStartOfDay(fromStr);
    reportDateToParsed = ymdToLocalEndOfDay(toStr);
    if (reportDateFromParsed.getTime() > reportDateToParsed.getTime()) {
      return NextResponse.json(
        { ok: false, error: "Start date must be on or before end date." },
        { status: 400 },
      );
    }
    const maxSpanMs = 10 * 366 * 24 * 60 * 60 * 1000;
    if (reportDateToParsed.getTime() - reportDateFromParsed.getTime() > maxSpanMs) {
      return NextResponse.json(
        { ok: false, error: "Date range cannot exceed 10 years." },
        { status: 400 },
      );
    }
  }

  const facultyIdParsed = parsePositiveIntId(body.facultyId);
  const departmentIdParsed = parsePositiveIntId(body.departmentId);

  if (facultyIdParsed != null && reportType !== "faculty-wise-research") {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }
  if (departmentIdParsed != null && reportType !== "department-wise-research") {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  let facultyWiseFocusName: string | null = null;
  let departmentFilterRow: { id: number; faculty_id: number; name: string } | null = null;
  let departmentWiseFacultyName: string | null = null;

  if (reportType === "faculty-wise-research") {
    if (!facultyIdParsed || facultyIdParsed <= 0) {
      return NextResponse.json(
        { ok: false, error: "Select a faculty to generate this report." },
        { status: 400 },
      );
    }
    const faculties = await listFaculties();
    const f = faculties.find((row) => intIdEq(row.id, facultyIdParsed) && row.is_active);
    if (!f) {
      return NextResponse.json({ ok: false, error: "Faculty not found." }, { status: 404 });
    }
    if (!isAdministrator(actor)) {
      if (
        actor.scopeMode === "restricted" &&
        !actor.facultyIds.some((fid) => intIdEq(fid, f.id))
      ) {
        return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
      }
    }
    facultyWiseFocusName = f.name;
  }

  if (reportType === "department-wise-research") {
    if (!departmentIdParsed || departmentIdParsed <= 0) {
      return NextResponse.json(
        { ok: false, error: "Select a department to generate this report." },
        { status: 400 },
      );
    }
    const d = await getDepartmentRow(departmentIdParsed);
    if (!d) {
      return NextResponse.json({ ok: false, error: "Department not found." }, { status: 404 });
    }
    const faculties = await listFaculties();
    const f = faculties.find((row) => intIdEq(row.id, d.faculty_id) && row.is_active);
    if (!f) {
      return NextResponse.json({ ok: false, error: "Department not available." }, { status: 404 });
    }
    if (!isAdministrator(actor)) {
      if (
        actor.scopeMode === "restricted" &&
        !actor.facultyIds.some((fid) => intIdEq(fid, f.id))
      ) {
        return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
      }
    }
    departmentFilterRow = d;
    departmentWiseFacultyName = f.name;
  }

  const institutionWide =
    !isAdministrator(actor) ? false : reportType !== "hods-report";

  let scopeForFilter: AuthenticatedAdmin = actor;
  let skipFacultyFilter = institutionWide;
  let subjectLine: string | undefined;
  let periodLabelStr: string;
  let dateStart: Date | null;
  let dateEnd: Date | null;
  let hodReportPack: { user: AdminUserRecord; scope: AdminScope } | null = null;

  if (reportType === "hods-report") {
    const fromStr = parseYmdString(body.hodReportDateFrom);
    const toStr = parseYmdString(body.hodReportDateTo);
    if (!fromStr || !toStr) {
      return NextResponse.json(
        { ok: false, error: "Select a start and end date for the HOD's Report." },
        { status: 400 },
      );
    }
    dateStart = ymdToLocalStartOfDay(fromStr);
    dateEnd = ymdToLocalEndOfDay(toStr);
    if (dateStart.getTime() > dateEnd.getTime()) {
      return NextResponse.json(
        { ok: false, error: "Start date must be on or before end date." },
        { status: 400 },
      );
    }
    const maxSpanMs = 10 * 366 * 24 * 60 * 60 * 1000;
    if (dateEnd.getTime() - dateStart.getTime() > maxSpanMs) {
      return NextResponse.json(
        { ok: false, error: "Date range cannot exceed 10 years." },
        { status: 400 },
      );
    }
    periodLabelStr = `${dateStart.toLocaleDateString(undefined, {
      dateStyle: "medium",
    })} – ${dateEnd.toLocaleDateString(undefined, { dateStyle: "medium" })}`;

    const targetHodId = isAdministrator(actor) ? hodIdRaw : actor.adminId;
    const hodUser = await getAdminUserById(targetHodId);
    // The hod_user_id assignment is authoritative — the admin may have
    // been promoted from hod to administrator but is still the assigned
    // reviewer. Only require an active status, not a specific role.
    if (!hodUser || hodUser.status !== "active") {
      return NextResponse.json({ ok: false, error: "HOD not found." }, { status: 404 });
    }
    const hodScope = await getAdminScope(hodUser);
    scopeForFilter = scopeCheckAdmin(hodScope);
    skipFacultyFilter = false;
    subjectLine = `${hodUser.name} (${hodUser.email})`;
    hodReportPack = { user: hodUser, scope: hodScope };
  } else {
    dateStart = reportDateFromParsed!;
    dateEnd = reportDateToParsed!;
    periodLabelStr = formatDateRangeLabel(dateStart, dateEnd);
  }

  const rawRows = await fetchReportSubmissionRows(dateStart, dateEnd);
  let rows = await filterReportRowsByScope(scopeForFilter, skipFacultyFilter, rawRows);

  if (reportType === "faculty-wise-research" && facultyIdParsed) {
    rows = await filterReportRowsByMasterFacultyId(rows, facultyIdParsed);
  }
  if (reportType === "department-wise-research" && departmentFilterRow) {
    rows = await filterReportRowsByDepartmentId(rows, departmentFilterRow);
  }

  const generatedAt = new Date();
  const baseCtx: Omit<AggregateReportContext, "reportTitle"> = {
    generatedAt,
    periodLabel: periodLabelStr,
    scopeDescription: scopeDescriptionForCatalog(
      institutionWide ? actor : scopeForFilter,
      institutionWide,
      reportType === "hods-report",
    ),
    subjectLine,
  };

  let html: string;
  let title: string;

  switch (reportType) {
    case "hods-report": {
      if (!hodReportPack) {
        return NextResponse.json({ ok: false, error: "HOD not found." }, { status: 404 });
      }
      const { user: hodUser, scope: hodScope } = hodReportPack;
      const institutionTotal = await fetchInstitutionNonDraftSubmissionCount(dateStart, dateEnd);
      const facultyLabel = await fetchFacultyNamesForIds(hodScope.facultyIds);
      const rejectedIds = [
        ...new Set(rows.filter((r) => r.current_status === "hod_rejected").map((r) => r.application_id)),
      ];
      const rejectionReasonStated = await classifyHodRejectionReasonStated(rejectedIds);
      html = buildHodReportHtml(
        {
          hod: { name: hodUser.name, email: hodUser.email, sapId: hodUser.sapId },
          facultyLabel,
          rows,
          institutionTotalSubmissions: institutionTotal,
          rejectionReasonStated,
        },
        {
          ...baseCtx,
          reportTitle: "HOD's Report",
        },
      );
      title = `HOD's Report  ${subjectLine ?? "HOD"} — ${periodLabelStr}`;
      break;
    }
    case "total-efficiency":
      html = buildTotalEfficiencyReportHtml(rows, {
        ...baseCtx,
        reportTitle: "Total Efficiency Report",
      });
      title = `Total Efficiency Report — ${periodLabelStr}`;
      break;
    case "overall-research-specific":
      html = buildOverallResearchSpecificReportHtml(rows, {
        ...baseCtx,
        reportTitle: "Overall Research Specific Report",
      });
      title = `Overall Research Specific Report — ${periodLabelStr}`;
      break;
    case "overall-student": {
      const studentRows = rows.filter(isStudentCohortRow);
      html = buildOverallStudentReportHtml(studentRows, {
        ...baseCtx,
        reportTitle: "Overall Student Report",
      });
      title = `Overall Student Report — ${periodLabelStr}`;
      break;
    }
    case "overall-faculty": {
      const scopedAll = rows;
      const facultyRows = scopedAll.filter(isFacultyStaffPublicationRow);
      html = buildOverallFacultyReportHtml(facultyRows, scopedAll, {
        ...baseCtx,
        reportTitle: "Overall Faculty Report",
      });
      title = `Overall Faculty Report — ${periodLabelStr}`;
      break;
    }
    case "faculty-wise-research": {
      if (!facultyWiseFocusName || !facultyIdParsed) {
        return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
      }
      html = buildFacultyWiseResearchReportHtml(
        rows,
        {
          ...baseCtx,
          reportTitle: "Faculty Wise Research Report",
        },
        { facultyName: facultyWiseFocusName },
      );
      title = `Faculty Wise Research Report — ${facultyWiseFocusName} — ${periodLabelStr}`;
      break;
    }
    case "department-wise-research": {
      if (!departmentFilterRow || !departmentWiseFacultyName) {
        return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
      }
      html = buildDepartmentWiseResearchReportHtml(
        rows,
        {
          ...baseCtx,
          reportTitle: "Department Wise Research Report",
        },
        {
          departmentName: departmentFilterRow.name,
          facultyName: departmentWiseFacultyName,
        },
      );
      title = `Department Wise Research Report — ${departmentFilterRow.name} — ${periodLabelStr}`;
      break;
    }
    default:
      return NextResponse.json({ ok: false, error: "Unknown report type." }, { status: 404 });
  }

  void logActivityFromRequest(request, {
    actionCode: "admin.report.export",
    targetType: "report",
    targetId: reportType,
    targetLabel: title,
    metadata: {
      reportType,
      periodLabel: periodLabelStr,
      dateStart: dateStart.toISOString(),
      dateEnd: dateEnd.toISOString(),
    },
  });

  return NextResponse.json({ ok: true, html, title });
}
