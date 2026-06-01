"use client";

import { ReportCatalogCard } from "@/app/reports/_components/report-catalog-card";
import { DeanPickerSelect } from "@/app/reports/_components/dean-picker-select";
import {
  createDefaultReportDateRange,
  isReportDateRangeValid,
  ReportDateRange,
  type ReportDateRangeValue,
} from "@/app/reports/_components/report-date-range";
import { ReportPreviewModal } from "@/app/reports/_components/report-preview-modal";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type AdminRole = "administrator" | "dean" | "ireb";

type DeanRow = { id: string; name: string; email: string };

type ReportSlug =
  | "deans-report"
  | "total-efficiency"
  | "overall-research-specific"
  | "overall-student"
  | "overall-faculty"
  | "faculty-wise-research"
  | "department-wise-research";

const REPORT_SLUGS: ReportSlug[] = [
  "deans-report",
  "total-efficiency",
  "overall-research-specific",
  "overall-student",
  "overall-faculty",
  "faculty-wise-research",
  "department-wise-research",
];

type ReportFilterFaculty = { id: number; name: string };
type ReportFilterDepartment = {
  id: number;
  name: string;
  facultyId: number;
  facultyName: string;
};

function buildInitialDateRanges(): Record<ReportSlug, ReportDateRangeValue> {
  return Object.fromEntries(
    REPORT_SLUGS.map((slug) => [slug, createDefaultReportDateRange()]),
  ) as Record<ReportSlug, ReportDateRangeValue>;
}

export function ReportsCatalog({ adminRole }: { adminRole: AdminRole }) {
  const isAdministrator = adminRole === "administrator";

  const [deans, setDeans] = useState<DeanRow[]>([]);
  const [deansLoading, setDeansLoading] = useState(isAdministrator);
  const [deanId, setDeanId] = useState("");

  const [dateRanges, setDateRanges] = useState(buildInitialDateRanges);

  const setReportDateRange = useCallback((slug: ReportSlug, next: ReportDateRangeValue) => {
    setDateRanges((prev) => ({ ...prev, [slug]: next }));
  }, []);

  const [reportFaculties, setReportFaculties] = useState<ReportFilterFaculty[]>([]);
  const [reportDepartments, setReportDepartments] = useState<ReportFilterDepartment[]>([]);
  const [reportFiltersLoading, setReportFiltersLoading] = useState(true);
  const [facultyWiseFacultyId, setFacultyWiseFacultyId] = useState("");
  const [deptWiseDepartmentId, setDeptWiseDepartmentId] = useState("");

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewSlug, setPreviewSlug] = useState<ReportSlug | null>(null);
  const [generating, setGenerating] = useState<ReportSlug | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const downloadRef = useRef<{ html: string; slug: ReportSlug } | null>(null);

  useEffect(() => {
    downloadRef.current = previewOpen && previewHtml && previewSlug
      ? { html: previewHtml, slug: previewSlug }
      : null;
  }, [previewOpen, previewHtml, previewSlug]);

  useEffect(() => {
    if (!isAdministrator) return;
    let cancelled = false;
    setDeansLoading(true);
    void (async () => {
      try {
        const res = await fetch("/api/admin/reports/deans", { cache: "no-store" });
        const data = (await res.json()) as { ok?: boolean; deans?: DeanRow[] };
        if (cancelled) return;
        if (res.ok && data.ok && data.deans) setDeans(data.deans);
        else toast.error("Could not load dean list.");
      } catch {
        if (!cancelled) toast.error("Could not load dean list.");
      } finally {
        if (!cancelled) setDeansLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdministrator]);

  useEffect(() => {
    let cancelled = false;
    setReportFiltersLoading(true);
    void (async () => {
      try {
        const res = await fetch("/api/admin/reports/report-filters", { cache: "no-store" });
        const data = (await res.json()) as {
          ok?: boolean;
          faculties?: ReportFilterFaculty[];
          departments?: ReportFilterDepartment[];
        };
        if (cancelled) return;
        if (res.ok && data.ok && data.faculties && data.departments) {
          setReportFaculties(data.faculties);
          setReportDepartments(data.departments);
        } else {
          toast.error("Could not load faculty/department lists for reports.");
        }
      } catch {
        if (!cancelled) toast.error("Could not load faculty/department lists for reports.");
      } finally {
        if (!cancelled) setReportFiltersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const downloadPdf = useCallback(async () => {
    const d = downloadRef.current;
    if (!d?.html || pdfBusy) return;
    setPdfBusy(true);
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      const base = `${d.slug.replace(/-/g, "_")}-${stamp}`;
      const { downloadReportPdf } = await import("@/lib/download-admin-report-pdf");
      await downloadReportPdf(base, {
        previewIframe: iframeRef.current,
        html: d.html,
      });
      toast.success("Report downloaded.");
    } catch {
      const message =
        "Could not generate the PDF. Use Print → Save as PDF from the preview, or try again.";
      toast.error(message);
    } finally {
      setPdfBusy(false);
    }
  }, [pdfBusy]);

  useEffect(() => {
    const onMsg = (ev: MessageEvent) => {
      if (ev.data?.type !== "IREB_ADMIN_REPORT_DOWNLOAD") return;
      void downloadPdf();
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [downloadPdf]);

  const generate = async (slug: ReportSlug) => {
    const range = dateRanges[slug];
    setGenerating(slug);
    try {
      const body: Record<string, unknown> =
        slug === "deans-report"
          ? isAdministrator
            ? {
                deanId: deanId || undefined,
                deanReportDateFrom: range.from,
                deanReportDateTo: range.to,
              }
            : { deanReportDateFrom: range.from, deanReportDateTo: range.to }
          : slug === "faculty-wise-research"
            ? {
                reportDateFrom: range.from,
                reportDateTo: range.to,
                facultyId: Number(facultyWiseFacultyId),
              }
            : slug === "department-wise-research"
              ? {
                  reportDateFrom: range.from,
                  reportDateTo: range.to,
                  departmentId: Number(deptWiseDepartmentId),
                }
              : { reportDateFrom: range.from, reportDateTo: range.to };

      const res = await fetch(`/api/admin/reports/${slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { ok?: boolean; html?: string; title?: string; error?: string };
      if (!res.ok || !data.ok || !data.html) {
        toast.error(data.error ?? "Could not generate report.");
        return;
      }
      setPreviewHtml(data.html);
      setPreviewTitle(data.title ?? "Report");
      setPreviewSlug(slug);
      setPreviewOpen(true);
    } catch {
      toast.error("Could not generate report.");
    } finally {
      setGenerating(null);
    }
  };

  const primaryBtn = (slug: ReportSlug, label = "Preview report", extraDisabled?: boolean) => (
    <button
      type="button"
      disabled={Boolean(generating) || extraDisabled}
      onClick={() => void generate(slug)}
      className={cn(
        "rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-opacity-90",
        generating && generating !== slug && "opacity-50",
      )}
    >
      {generating === slug ? "Generating…" : label}
    </button>
  );

  const dateRangeInvalid = (slug: ReportSlug) => !isReportDateRangeValid(dateRanges[slug]);

  return (
    <div className="space-y-8">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Reporting</p>
        <p className="mt-2 text-sm leading-relaxed text-body">
          Generate scoped institutional reports. Output opens in a print-ready preview; use{" "}
          <span className="font-medium text-dark dark:text-white">Print / Save as PDF</span> or{" "}
          <span className="font-medium text-dark dark:text-white">Download PDF</span> for exports.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {adminRole !== "ireb" ? (
          <ReportCatalogCard
            title="Dean's Report"
            description="Single-dean performance snapshot for submissions received in the selected date range: approvals, rejections, stated rejection reasons, response timing, delay flag, and share of institution-wide submissions in that same range (faculty-scoped)."
            badge="Scope / Dates"
            controls={
              <div className="flex flex-col gap-3">
                {isAdministrator ? (
                  <DeanPickerSelect
                    deans={deans}
                    value={deanId}
                    onChange={setDeanId}
                    loading={deansLoading}
                  />
                ) : (
                  <p className="text-xs text-body">
                    This report uses your assigned dean faculty automatically.
                  </p>
                )}
                <ReportDateRange
                  idPrefix="deans-report"
                  range={dateRanges["deans-report"]}
                  onChange={(next) => setReportDateRange("deans-report", next)}
                />
              </div>
            }
            action={primaryBtn(
              "deans-report",
              "Preview report",
              Boolean((isAdministrator && !deanId.trim()) || dateRangeInvalid("deans-report")),
            )}
          />
        ) : null}

        <ReportCatalogCard
          title="Total Efficiency Report"
          description="Throughput, status mix, and timing metrics for the selected date range — scoped to your faculties, or institution-wide for administrators."
          badge="Date range"
          controls={
            <ReportDateRange
              idPrefix="total-efficiency"
              range={dateRanges["total-efficiency"]}
              onChange={(next) => setReportDateRange("total-efficiency", next)}
            />
          }
          action={primaryBtn("total-efficiency", "Preview report", dateRangeInvalid("total-efficiency"))}
        />

        <ReportCatalogCard
          title="Overall Research Specific Report"
          description="Thesis vs publication and medical vs non-medical mix for the selected date range, with status and faculty volume context."
          badge="Date range"
          controls={
            <ReportDateRange
              idPrefix="overall-research-specific"
              range={dateRanges["overall-research-specific"]}
              onChange={(next) => setReportDateRange("overall-research-specific", next)}
            />
          }
          action={primaryBtn(
            "overall-research-specific",
            "Preview report",
            dateRangeInvalid("overall-research-specific"),
          )}
        />

        <ReportCatalogCard
          title="Overall Student Report"
          description="UOL student applicants (@student.uol.edu.pk), thesis and publications: program mix, faculty concentration, thesis vs publication volume, outcomes, response times, and top SDGs."
          badge="Date range"
          controls={
            <ReportDateRange
              idPrefix="overall-student"
              range={dateRanges["overall-student"]}
              onChange={(next) => setReportDateRange("overall-student", next)}
            />
          }
          action={primaryBtn("overall-student", "Preview report", dateRangeInvalid("overall-student"))}
        />

        <ReportCatalogCard
          title="Overall Faculty Report"
          description="Faculty/staff research publications only (excludes @student.uol.edu.pk). One summary table: volume, faculty/department concentration, PhD share, medical vs other domain counts, approval/rejection rates, attempts, student dean-throughput by faculty snapshot, response times, processing days, and top SDGs."
          badge="Date range"
          controls={
            <ReportDateRange
              idPrefix="overall-faculty"
              range={dateRanges["overall-faculty"]}
              onChange={(next) => setReportDateRange("overall-faculty", next)}
            />
          }
          action={primaryBtn("overall-faculty", "Preview report", dateRangeInvalid("overall-faculty"))}
        />

        <ReportCatalogCard
          title="Faculty Wise Research Report"
          description="Per-faculty snapshot for the selected date range: thesis vs publication volume, approval/rejection/pending counts, common research purpose, top SDGs, highest and lowest department volume within the faculty, and faculty-applicant share."
          badge="Faculty / Date range"
          controls={
            <div className="flex flex-col gap-3">
              <ReportDateRange
                idPrefix="faculty-wise-research"
                range={dateRanges["faculty-wise-research"]}
                onChange={(next) => setReportDateRange("faculty-wise-research", next)}
              />
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-dark-5 dark:text-dark-6">
                  Faculty
                </span>
                <select
                  disabled={reportFiltersLoading}
                  value={facultyWiseFacultyId}
                  onChange={(e) => setFacultyWiseFacultyId(e.target.value)}
                  className="w-full max-w-md rounded-lg border border-stroke bg-white px-3 py-2 text-sm font-medium text-dark dark:border-dark-3 dark:bg-gray-dark dark:text-white"
                >
                  <option value="">
                    {reportFiltersLoading ? "Loading…" : "Select a faculty…"}
                  </option>
                  {reportFaculties.map((f) => (
                    <option key={f.id} value={String(f.id)}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          }
          action={primaryBtn(
            "faculty-wise-research",
            "Preview report",
            !facultyWiseFacultyId.trim() ||
              reportFiltersLoading ||
              dateRangeInvalid("faculty-wise-research"),
          )}
        />

        <ReportCatalogCard
          title="Department Wise Research Report"
          description="Per-department snapshot for the selected date range: thesis vs publication volume, outcomes, common research purpose, top SDGs, and faculty-applicant share — scoped to the selected master department record."
          badge="Department / Date range"
          controls={
            <div className="flex flex-col gap-3">
              <ReportDateRange
                idPrefix="department-wise-research"
                range={dateRanges["department-wise-research"]}
                onChange={(next) => setReportDateRange("department-wise-research", next)}
              />
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold uppercase tracking-wide text-dark-5 dark:text-dark-6">
                  Department
                </span>
                <select
                  disabled={reportFiltersLoading}
                  value={deptWiseDepartmentId}
                  onChange={(e) => setDeptWiseDepartmentId(e.target.value)}
                  className="w-full max-w-md rounded-lg border border-stroke bg-white px-3 py-2 text-sm font-medium text-dark dark:border-dark-3 dark:bg-gray-dark dark:text-white"
                >
                  <option value="">
                    {reportFiltersLoading ? "Loading…" : "Select a department…"}
                  </option>
                  {reportDepartments.map((d) => (
                    <option key={d.id} value={String(d.id)}>
                      {d.name} — {d.facultyName}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          }
          action={primaryBtn(
            "department-wise-research",
            "Preview report",
            !deptWiseDepartmentId.trim() ||
              reportFiltersLoading ||
              dateRangeInvalid("department-wise-research"),
          )}
        />
      </div>

      <ReportPreviewModal
        open={previewOpen}
        title={previewTitle}
        html={previewHtml}
        busy={pdfBusy}
        iframeRef={iframeRef}
        onClose={() => {
          setPreviewOpen(false);
          setPreviewHtml("");
          setPreviewSlug(null);
        }}
        onDownload={downloadPdf}
      />
    </div>
  );
}
