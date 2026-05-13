"use client";

import { ReportCatalogCard } from "@/app/reports/_components/report-catalog-card";
import { DeanPickerSelect } from "@/app/reports/_components/dean-picker-select";
import { ReportPeriodControl, type ReportPeriod } from "@/app/reports/_components/report-period-control";
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
  | "overall-faculty";

export function ReportsCatalog({ adminRole }: { adminRole: AdminRole }) {
  const isAdministrator = adminRole === "administrator";
  const now = new Date();

  const [period, setPeriod] = useState<ReportPeriod>("monthly");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);

  const [deans, setDeans] = useState<DeanRow[]>([]);
  const [deansLoading, setDeansLoading] = useState(isAdministrator);
  const [deanId, setDeanId] = useState("");

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
            ? { deanId: deanId || undefined }
            : {}
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
            description="Summary of applications under the dean's faculty scope. Administrators must pick a dean; deans always see their own scope."
            badge="Scope"
            controls={
              isAdministrator ? (
                <DeanPickerSelect
                  deans={deans}
                  value={deanId}
                  onChange={setDeanId}
                  loading={deansLoading}
                />
              ) : (
                <p className="text-xs text-body">This report uses your assigned dean faculty automatically.</p>
              )
            }
            action={primaryBtn("deans-report", "Preview report", isAdministrator && !deanId.trim())}
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
          description="Efficiency and research mix for student applicants only, for the selected period."
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
          description="Efficiency and research mix for faculty applicants only, for the selected period."
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
