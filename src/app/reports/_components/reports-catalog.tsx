"use client";

import { ReportCatalogCard } from "@/app/reports/_components/report-catalog-card";
import { HodPickerSelect } from "@/app/reports/_components/hod-picker-select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  createDefaultReportDateRange,
  isReportDateRangeValid,
  ReportDateRange,
  type ReportDateRangeValue,
} from "@/app/reports/_components/report-date-range";
import { ReportPreviewModal } from "@/app/reports/_components/report-preview-modal";
import { cn } from "@/lib/utils";
import {
  Building2,
  FolderTree,
  Gauge,
  GraduationCap,
  PieChart,
  UserCheck,
  Users,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type AdminRole = "administrator" | "hod" | "ireb";

type HodRow = { id: string; name: string; email: string };

type ReportSlug =
  | "hods-report"
  | "total-efficiency"
  | "overall-research-specific"
  | "overall-student"
  | "overall-faculty"
  | "faculty-wise-research"
  | "department-wise-research";

const REPORT_SLUGS: ReportSlug[] = [
  "hods-report",
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

  const [hods, setHods] = useState<HodRow[]>([]);
  const [hodsLoading, setHodsLoading] = useState(isAdministrator);
  const [hodId, setHodId] = useState("");

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
    setHodsLoading(true);
    void (async () => {
      try {
        const res = await fetch("/api/admin/reports/hods", { cache: "no-store" });
        const data = (await res.json()) as { ok?: boolean; hods?: HodRow[] };
        if (cancelled) return;
        if (res.ok && data.ok && data.hods) setHods(data.hods);
        else toast.error("Could not load hod list.");
      } catch {
        if (!cancelled) toast.error("Could not load hod list.");
      } finally {
        if (!cancelled) setHodsLoading(false);
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
        slug === "hods-report"
          ? isAdministrator
            ? {
                hodId: hodId || undefined,
                hodReportDateFrom: range.from,
                hodReportDateTo: range.to,
              }
            : { hodReportDateFrom: range.from, hodReportDateTo: range.to }
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

  const iconCls = "size-5";

  const reportSection = (title: string, caption: string, children: React.ReactNode) => (
    <section>
      <div className="mb-4 flex items-baseline justify-between gap-3 border-b border-stroke pb-3 dark:border-dark-3">
        <div>
          <h3 className="text-base font-semibold text-dark dark:text-white">{title}</h3>
          <p className="mt-0.5 text-xs text-dark-5">{caption}</p>
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2">{children}</div>
    </section>
  );

  return (
    <div className="space-y-8">
      <div className="max-w-3xl">
        <h2 className="text-xl font-semibold text-dark dark:text-white">Reports</h2>
        <p className="mt-1 text-sm leading-relaxed text-body dark:text-dark-6">
          Output opens in a print-ready preview — use{" "}
          <span className="font-medium text-dark dark:text-white">Print / Save as PDF</span> or{" "}
          <span className="font-medium text-dark dark:text-white">Download PDF</span> to export.
        </p>
      </div>

      {reportSection(
        "Institution-wide",
        "Reports spanning the whole institution for the selected range",
        <>
          <ReportCatalogCard
            icon={<Gauge className={iconCls} aria-hidden />}
            title="Total Efficiency Report"
            description="Throughput, status mix, and turnaround times for the selected date range — scoped to your faculties, or institution-wide for administrators."
            tags={["Throughput", "Status mix", "Timing"]}
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
            icon={<PieChart className={iconCls} aria-hidden />}
            title="Overall Research Specific Report"
            description="Thesis vs publication volume and the medical vs non-medical mix for the selected date range, with status and faculty context."
            tags={["Thesis vs publication", "Domain mix", "Faculty volume"]}
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
            icon={<GraduationCap className={iconCls} aria-hidden />}
            title="Overall Student Report"
            description="UOL student applicants, thesis and publications: program mix, outcomes, response times, and top SDGs."
            tags={["Program mix", "Outcomes", "Response time", "SDGs"]}
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
            icon={<Users className={iconCls} aria-hidden />}
            title="Overall Faculty Report"
            description="Faculty and staff research publications: volume, concentration, approval rates, and processing time."
            tags={["PhD share", "Approval rate", "Processing days", "SDGs"]}
            controls={
              <ReportDateRange
                idPrefix="overall-faculty"
                range={dateRanges["overall-faculty"]}
                onChange={(next) => setReportDateRange("overall-faculty", next)}
              />
            }
            action={primaryBtn("overall-faculty", "Preview report", dateRangeInvalid("overall-faculty"))}
          />
        </>,
      )}

      {reportSection(
        "Scoped reports",
        "One unit at a time — pick the hod, faculty, or department and a date range",
        <>
          {adminRole !== "ireb" ? (
            <ReportCatalogCard
              icon={<UserCheck className={iconCls} aria-hidden />}
              title="HOD's Report"
              description="A single hod's approvals, rejections, stated reasons, and response timing for the selected range."
              tags={["Approvals", "Rejections", "Response time", "Delay flag"]}
              controls={
                <div className="flex flex-col gap-3">
                  {isAdministrator ? (
                    <HodPickerSelect
                      hods={hods}
                      value={hodId}
                      onChange={setHodId}
                      loading={hodsLoading}
                    />
                  ) : (
                    <p className="text-xs text-body">
                      This report uses your assigned hod faculty automatically.
                    </p>
                  )}
                  <ReportDateRange
                    idPrefix="hods-report"
                    range={dateRanges["hods-report"]}
                    onChange={(next) => setReportDateRange("hods-report", next)}
                  />
                </div>
              }
              action={primaryBtn(
                "hods-report",
                "Preview report",
                Boolean((isAdministrator && !hodId.trim()) || dateRangeInvalid("hods-report")),
              )}
            />
          ) : null}

          <ReportCatalogCard
            icon={<Building2 className={iconCls} aria-hidden />}
            title="Faculty Wise Research Report"
            description="One faculty's research volume, outcomes, common purpose, and top departments for the selected range."
            tags={["Volume", "Outcomes", "Top SDGs", "Departments"]}
            controls={
              <div className="flex flex-col gap-3">
                <ReportDateRange
                  idPrefix="faculty-wise-research"
                  range={dateRanges["faculty-wise-research"]}
                  onChange={(next) => setReportDateRange("faculty-wise-research", next)}
                />
                <SearchableSelect
                  label="Faculty"
                  placeholder={reportFiltersLoading ? "Loading…" : "Select a faculty…"}
                  searchPlaceholder="Search faculties…"
                  disabled={reportFiltersLoading}
                  loading={reportFiltersLoading}
                  options={reportFaculties.map((f) => ({
                    value: String(f.id),
                    label: f.name,
                  }))}
                  value={facultyWiseFacultyId}
                  onChange={setFacultyWiseFacultyId}
                  triggerClassName="max-w-md"
                />
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
            icon={<FolderTree className={iconCls} aria-hidden />}
            title="Department Wise Research Report"
            description="One department's research volume, outcomes, and purpose mix — scoped to the selected master department record."
            tags={["Volume", "Outcomes", "Research purpose"]}
            controls={
              <div className="flex flex-col gap-3">
                <ReportDateRange
                  idPrefix="department-wise-research"
                  range={dateRanges["department-wise-research"]}
                  onChange={(next) => setReportDateRange("department-wise-research", next)}
                />
                <SearchableSelect
                  label="Department"
                  placeholder={reportFiltersLoading ? "Loading…" : "Select a department…"}
                  searchPlaceholder="Search departments…"
                  disabled={reportFiltersLoading}
                  loading={reportFiltersLoading}
                  options={reportDepartments.map((d) => ({
                    value: String(d.id),
                    label: d.name,
                    hint: d.facultyName,
                  }))}
                  value={deptWiseDepartmentId}
                  onChange={setDeptWiseDepartmentId}
                  triggerClassName="max-w-md"
                />
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
        </>,
      )}

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
