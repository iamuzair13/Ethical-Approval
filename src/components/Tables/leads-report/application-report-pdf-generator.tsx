"use client";

import {
  buildApplicationReportHtml,
  type SubmissionReportInput,
} from "@/lib/application-report-html";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useState } from "react";
import { toast } from "sonner";

type ApplicationReportPdfGeneratorProps = {
  submission: SubmissionReportInput | null;
  applicationId: string;
  submissionId: number;
  className?: string;
};

async function generateApplicationReportPdf(
  submission: SubmissionReportInput,
  applicationId: string,
  submissionId: number,
) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "-10000px";
  iframe.style.bottom = "0";
  iframe.style.width = "1024px";
  iframe.style.height = "1200px";
  iframe.style.opacity = "0";
  iframe.setAttribute("aria-hidden", "true");
  document.body.appendChild(iframe);

  try {
    const reportHtml = buildApplicationReportHtml(submission);
    const frameDoc = iframe.contentDocument;
    if (!frameDoc) {
      throw new Error("Unable to create PDF document frame.");
    }

    frameDoc.open();
    frameDoc.write(reportHtml);
    frameDoc.close();

    await new Promise<void>((resolve) => {
      iframe.onload = () => resolve();
      window.setTimeout(resolve, 240);
    });

    const target = frameDoc.documentElement;
    const canvas = await html2canvas(target, {
      scale: 1,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      windowWidth: 1024,
    });

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "pt",
      format: "a4",
      compress: true,
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 24;
    const printableWidth = pageWidth - margin * 2;
    const imageHeight = (canvas.height * printableWidth) / canvas.width;
    const pageContentHeight = pageHeight - margin * 2;
    const imageData = canvas.toDataURL("image/jpeg", 0.7);

    let heightLeft = imageHeight;
    let position = margin;

    // Draw same image across pages with Y offset; avoids slice seam/break artifacts.
    pdf.addImage(imageData, "JPEG", margin, position, printableWidth, imageHeight, undefined, "FAST");
    heightLeft -= pageContentHeight;

    while (heightLeft > 0) {
      pdf.addPage();
      position = margin - (imageHeight - heightLeft);
      pdf.addImage(imageData, "JPEG", margin, position, printableWidth, imageHeight, undefined, "FAST");
      heightLeft -= pageContentHeight;
    }

    pdf.save(`application-${applicationId}-${submissionId}.pdf`);
  } finally {
    iframe.remove();
  }
}

export function ApplicationReportPdfGeneratorButton({
  submission,
  applicationId,
  submissionId,
  className,
}: ApplicationReportPdfGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!submission) {
      toast.error("Submission data is not available for PDF generation.");
      return;
    }
    setIsGenerating(true);
    try {
      await generateApplicationReportPdf(submission, applicationId, submissionId);
      toast.success("Professional PDF report downloaded.");
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
      {isGenerating ? "Generating PDF..." : "Download application report (PDF)"}
    </button>
  );
}