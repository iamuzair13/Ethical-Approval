import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin, isAdministrator, type AuthenticatedAdmin } from "@/lib/admin-auth";
import {
  buildDeansReportHtml,
  buildOverallFacultyReportHtml,
  buildOverallResearchSpecificReportHtml,
  buildOverallStudentReportHtml,
  buildTotalEfficiencyReportHtml,
  type AggregateReportContext,
} from "@/lib/admin-aggregate-reports-html";
import { getAdminUserById, getAdminScope } from "@/lib/admin-repository";
import { fetchReportSubmissionRows, filterReportRowsByScope } from "@/lib/admin-report-queries";

const REPORT_TYPES = new Set([
  "deans-report",
  "total-efficiency",
  "overall-research-specific",
  "overall-student",
  "overall-faculty",
]);

type Period = "monthly" | "yearly";

type Body = {
  period?: Period;
  year?: number;
  month?: number;
  deanId?: string | null;
};

function periodWindow(period: Period, year: number, month: number): { start: Date; end: Date } {
  if (period === "yearly") {
    return {
      start: new Date(year, 0, 1, 0, 0, 0, 0),
      end: new Date(year, 11, 31, 23, 59, 59, 999),
    };
  }
  const m = Math.min(12, Math.max(1, month));
  return {
    start: new Date(year, m - 1, 1, 0, 0, 0, 0),
    end: new Date(year, m, 0, 23, 59, 59, 999),
  };
}

function periodLabel(period: Period, year: number, month: number): string {
  if (period === "yearly") {
    return `Calendar year ${year}`;
  }
  const d = new Date(year, month - 1, 1);
  return d.toLocaleString(undefined, { month: "long", year: "numeric" });
}

/** Synthetic admin for faculty snapshot checks (never role administrator). */
function scopeCheckAdmin(scope: { scopeMode: "all" | "restricted"; facultyIds: number[] }): AuthenticatedAdmin {
  return {
    adminId: "00000000-0000-0000-0000-000000000001",
    role: "dean",
    status: "active",
    scopeMode: scope.scopeMode,
    facultyIds: scope.facultyIds,
    tokenVersion: 0,
  };
}

function scopeDescriptionForCatalog(
  actor: AuthenticatedAdmin,
  institutionWide: boolean,
  deanReport: boolean,
): string {
  if (institutionWide) {
    return "All faculties — institution-wide";
  }
  if (deanReport) {
    if (actor.scopeMode === "all" || actor.facultyIds.length === 0) {
      return "Dean primary assignment (no faculty id resolved — verify assignments)";
    }
    return `Dean primary faculty scope (${actor.facultyIds.length} id(s))`;
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

  if (reportType === "deans-report" && actor.role === "ireb") {
    return NextResponse.json(
      { ok: false, error: "This report is not available for IREB accounts." },
      { status: 403 },
    );
  }

  const deanIdRaw = typeof body.deanId === "string" ? body.deanId.trim() : "";
  if (deanIdRaw && reportType !== "deans-report") {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  if (reportType === "deans-report" && isAdministrator(actor) && !deanIdRaw) {
    return NextResponse.json(
      { ok: false, error: "Select a dean to generate this report." },
      { status: 400 },
    );
  }

  if (!isAdministrator(actor) && deanIdRaw && deanIdRaw !== actor.adminId) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const period: Period = body.period === "yearly" ? "yearly" : "monthly";
  const year =
    typeof body.year === "number" && Number.isFinite(body.year)
      ? Math.floor(body.year)
      : new Date().getFullYear();
  const month =
    typeof body.month === "number" && Number.isFinite(body.month)
      ? Math.min(12, Math.max(1, Math.floor(body.month)))
      : new Date().getMonth() + 1;

  if (year < 2000 || year > 2100) {
    return NextResponse.json({ ok: false, error: "Invalid year." }, { status: 400 });
  }

  const institutionWide =
    !isAdministrator(actor) ? false : reportType !== "deans-report";

  let scopeForFilter: AuthenticatedAdmin = actor;
  let skipFacultyFilter = institutionWide;
  let subjectLine: string | undefined;
  let periodLabelStr: string;
  let dateStart: Date | null;
  let dateEnd: Date | null;

  if (reportType === "deans-report") {
    periodLabelStr = "All submissions (lifetime view)";
    dateStart = null;
    dateEnd = null;

    const targetDeanId = isAdministrator(actor) ? deanIdRaw : actor.adminId;
    const deanUser = await getAdminUserById(targetDeanId);
    if (!deanUser || deanUser.role !== "dean" || deanUser.status !== "active") {
      return NextResponse.json({ ok: false, error: "Dean not found." }, { status: 404 });
    }
    const deanScope = await getAdminScope(deanUser);
    scopeForFilter = scopeCheckAdmin(deanScope);
    skipFacultyFilter = false;
    subjectLine = `${deanUser.name} (${deanUser.email})`;
  } else {
    const w = periodWindow(period, year, month);
    dateStart = w.start;
    dateEnd = w.end;
    periodLabelStr = periodLabel(period, year, month);
  }

  const rawRows = await fetchReportSubmissionRows(dateStart, dateEnd);
  let rows = await filterReportRowsByScope(scopeForFilter, skipFacultyFilter, rawRows);

  if (reportType === "overall-student") {
    rows = rows.filter((r) => r.applicant_role === "student");
  } else if (reportType === "overall-faculty") {
    rows = rows.filter((r) => r.applicant_role === "faculty");
  }

  const generatedAt = new Date();
  const baseCtx: Omit<AggregateReportContext, "reportTitle"> = {
    generatedAt,
    periodLabel: periodLabelStr,
    scopeDescription: scopeDescriptionForCatalog(
      institutionWide ? actor : scopeForFilter,
      institutionWide,
      reportType === "deans-report",
    ),
    subjectLine,
  };

  let html: string;
  let title: string;

  switch (reportType) {
    case "deans-report":
      html = buildDeansReportHtml(rows, {
        ...baseCtx,
        reportTitle: "Dean's Report",
      });
      title = `Dean's Report — ${subjectLine ?? "Dean"}`;
      break;
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
    case "overall-student":
      html = buildOverallStudentReportHtml(rows, {
        ...baseCtx,
        reportTitle: "Overall Student Report",
      });
      title = `Overall Student Report — ${periodLabelStr}`;
      break;
    case "overall-faculty":
      html = buildOverallFacultyReportHtml(rows, {
        ...baseCtx,
        reportTitle: "Overall Faculty Report",
      });
      title = `Overall Faculty Report — ${periodLabelStr}`;
      break;
    default:
      return NextResponse.json({ ok: false, error: "Unknown report type." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, html, title });
}
