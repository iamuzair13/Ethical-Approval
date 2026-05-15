"use client";

import { ReportCatalogCard } from "@/app/reports/_components/report-catalog-card";
import { DeanReportDateRange, defaultDeanReportDateRange } from "@/app/reports/_components/dean-report-date-range";
import { DeanPickerSelect } from "@/app/reports/_components/dean-picker-select";
import { ReportPeriodControl, type ReportPeriod } from "@/app/reports/_components/report-period-control";
import { ReportPreviewModal } from "@/app/reports/_components/report-preview-modal";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type ReportFilterFaculty = { id: number; name: string };
type ReportFilterDepartment = {
  id: number;
  name: string;
  facultyId: number;
  facultyName: string;
};

export function ReportsCatalog({ adminRole }: { adminRole: AdminRole }) {
  const isAdministrator = adminRole === "administrator";
  const now = new Date();

  const [period, setPeriod] = useState<ReportPeriod>("monthly");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [deans, setDeans] = useState<DeanRow[]>([]);
  const [deansLoading, setDeansLoading] = useState(isAdministrator);
  const [deanId, setDeanId] = useState("");

  const deanRangeDefaults = useMemo(() => defaultDeanReportDateRange(), []);
  const [deanDateFrom, setDeanDateFrom] = useState(deanRangeDefaults.from);
  const [deanDateTo, setDeanDateTo] = useState(deanRangeDefaults.to);

  const onDeanDateFrom = useCallback((ymd: string) => {
    setDeanDateFrom(ymd);
    setDeanDateTo((prev) => (prev < ymd ? ymd : prev));
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
    setGenerating(slug);
    try {
      const body: Record<string, unknown> =
        slug === "deans-report"
          ? isAdministrator
            ? {
                deanId: deanId || undefined,
                deanReportDateFrom: deanDateFrom,
                deanReportDateTo: deanDateTo,
              }
            : { deanReportDateFrom: deanDateFrom, deanReportDateTo: deanDateTo }
          : slug === "faculty-wise-research"
            ? { period, year, month, facultyId: Number(facultyWiseFacultyId) }
            : slug === "department-wise-research"
              ? { period, year, month, departmentId: Number(deptWiseDepartmentId) }
              : { period, year, month };

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
                <DeanReportDateRange
                  dateFrom={deanDateFrom}
                  dateTo={deanDateTo}
                  onChangeFrom={onDeanDateFrom}
                  onChangeTo={setDeanDateTo}
                />
              </div>
            }
            action={primaryBtn(
              "deans-report",
              "Preview report",
              Boolean(
                (isAdministrator && !deanId.trim()) ||
                  !deanDateFrom.trim() ||
                  !deanDateTo.trim() ||
                  deanDateFrom > deanDateTo,
              ),
            )}
          />
        ) : null}

        <ReportCatalogCard
          title="Total Efficiency Report"
          description="Throughput, status mix, and timing metrics for the selected period — scoped to your faculties, or institution-wide for administrators."
          badge="Monthly / Yearly"
          controls={
            <ReportPeriodControl
              period={period}
              onPeriodChange={setPeriod}
              year={year}
              onYearChange={setYear}
              month={month}
              onMonthChange={setMonth}
            />
          }
          action={primaryBtn("total-efficiency")}
        />

        <ReportCatalogCard
          title="Overall Research Specific Report"
          description="Thesis vs publication and medical vs non-medical mix for the period, with status and faculty volume context."
          badge="Monthly / Yearly"
          controls={
            <ReportPeriodControl
              period={period}
              onPeriodChange={setPeriod}
              year={year}
              onYearChange={setYear}
              month={month}
              onMonthChange={setMonth}
            />
          }
          action={primaryBtn("overall-research-specific")}
        />

        <ReportCatalogCard
          title="Overall Student Report"
          description="UOL student applicants (@student.uol.edu.pk), thesis and publications: program mix, faculty concentration, thesis vs publication volume, outcomes, response times, and top SDGs."
          badge="Monthly / Yearly"
          controls={
            <ReportPeriodControl
              period={period}
              onPeriodChange={setPeriod}
              year={year}
              onYearChange={setYear}
              month={month}
              onMonthChange={setMonth}
            />
          }
          action={primaryBtn("overall-student")}
        />

        <ReportCatalogCard
          title="Overall Faculty Report"
          description="Faculty/staff research publications only (excludes @student.uol.edu.pk). One summary table: volume, faculty/department concentration, PhD share, medical vs other domain counts, approval/rejection rates, attempts, student dean-throughput by faculty snapshot, response times, processing days, and top SDGs."
          badge="Monthly / Yearly"
          controls={
            <ReportPeriodControl
              period={period}
              onPeriodChange={setPeriod}
              year={year}
              onYearChange={setYear}
              month={month}
              onMonthChange={setMonth}
            />
          }
          action={primaryBtn("overall-faculty")}
        />

        <ReportCatalogCard
          title="Faculty Wise Research Report"
          description="Per-faculty snapshot for the period: thesis vs publication volume, approval/rejection/pending counts, common research purpose, top SDGs, highest and lowest department volume within the faculty, and faculty-applicant share."
          badge="Faculty / Monthly / Yearly"
          controls={
            <div className="flex flex-col gap-3">
              <ReportPeriodControl
                period={period}
                onPeriodChange={setPeriod}
                year={year}
                onYearChange={setYear}
                month={month}
                onMonthChange={setMonth}
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
            !facultyWiseFacultyId.trim() || reportFiltersLoading,
          )}
        />

        <ReportCatalogCard
          title="Department Wise Research Report"
          description="Per-department snapshot for the period: thesis vs publication volume, outcomes, common research purpose, top SDGs, and faculty-applicant share — scoped to the selected master department record."
          badge="Department / Monthly / Yearly"
          controls={
            <div className="flex flex-col gap-3">
              <ReportPeriodControl
                period={period}
                onPeriodChange={setPeriod}
                year={year}
                onYearChange={setYear}
                month={month}
                onMonthChange={setMonth}
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
            !deptWiseDepartmentId.trim() || reportFiltersLoading,
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
