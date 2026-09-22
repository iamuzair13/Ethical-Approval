"use client";

import {
  buildApplicationReportHtml,
  type SubmissionReportInput,
} from "@/lib/application-report-html";
import { useState } from "react";
import { toast } from "sonner";

type ApplicationReportPdfGeneratorProps = {
  submission: SubmissionReportInput | null;
  applicationId: string;
  submissionId: number;
  className?: string;
};

/**
 * Opens the report in a hidden iframe and triggers the browser's print
 * engine. Print pagination respects `page-break-inside: avoid` on table
 * rows, so content is never sliced mid-row the way the old
 * html2canvas→jsPDF image-tiling approach cut pages at fixed pixel offsets.
 * The user chooses "Save as PDF" in the dialog; browsers suggest the
 * document <title> as the file name.
 */
function printApplicationReport(submission: SubmissionReportInput, applicationId: string) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "-10000px";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.opacity = "0";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  const frameDoc = iframe.contentDocument;
  if (!frameDoc) {
    iframe.remove();
    throw new Error("Unable to create print frame.");
  }

  const html = buildApplicationReportHtml(submission).replace(
    /<title>[\s\S]*?<\/title>/,
    `<title>application-${applicationId}</title>`,
  );

  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  const cleanup = () => iframe.remove();
  const triggerPrint = () => {
    const win = iframe.contentWindow;
    if (!win) {
      cleanup();
      return;
    }
    win.addEventListener("afterprint", cleanup);
    win.focus();
    win.print();
    // Fallback cleanup for browsers that don't fire afterprint on iframes.
    window.setTimeout(cleanup, 120_000);
  };

  if (iframe.contentDocument?.readyState === "complete") {
    triggerPrint();
  } else {
    iframe.onload = triggerPrint;
  }
}

export function ApplicationReportPdfGeneratorButton({
  submission,
  applicationId,
  className,
}: ApplicationReportPdfGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = () => {
    if (!submission) {
      toast.error("Submission data is not available for PDF generation.");
      return;
    }
    setIsGenerating(true);
    try {
      printApplicationReport(submission, applicationId);
      toast.success("Print dialog opened — choose “Save as PDF” to download.");
    } catch (error) {
      console.error("PDF generation failed", error);
      toast.error("Unable to generate PDF report. Try again in a few seconds.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleGenerate}
      disabled={isGenerating}
      className={className}
    >
      {isGenerating ? "Opening…" : "Download application report (PDF)"}
    </button>
  );
}
