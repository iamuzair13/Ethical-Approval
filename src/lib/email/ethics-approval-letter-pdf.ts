import dayjs from "dayjs";
import { jsPDF } from "jspdf";

export type EthicalApprovalLetterParams = {
  applicationId: string;
  applicantName: string;
  title: string;
  approvalDate: Date;
};

/**
 * Lightweight text-only PDF for email attachment (runs on Node; no html2canvas).
 */
export function buildEthicalApprovalLetterPdf(params: EthicalApprovalLetterParams): Buffer {
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const margin = 56;
  const pageHeight = pdf.internal.pageSize.getHeight();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const maxWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      pdf.addPage();
      y = margin;
    }
  };

  const writeLines = (lines: string[], fontSize: number, style: "normal" | "bold" = "normal") => {
    pdf.setFont("helvetica", style);
    pdf.setFontSize(fontSize);
    const lineHeight = fontSize * 1.35;
    for (const raw of lines) {
      const wrapped = pdf.splitTextToSize(raw, maxWidth);
      for (const line of wrapped) {
        ensureSpace(lineHeight);
        pdf.text(line, margin, y);
        y += lineHeight;
      }
    }
    y += 8;
  };

  const dateStr = dayjs(params.approvalDate).format("MMMM D, YYYY");

  writeLines(["The University of Lahore"], 11, "bold");
  writeLines(["Institutional Review Ethical Board (IREB)"], 11, "bold");
  y += 4;
  writeLines([`Date: ${dateStr}`], 10);
  writeLines(["ETHICAL APPROVAL LETTER"], 12, "bold");
  y += 4;

  writeLines(
    [
      `Ethical Approval Number: ${params.applicationId}`,
      "",
      `Dear ${params.applicantName},`,
      "",
      "We are pleased to inform you that your application has been approved by the Institutional Review Ethical Board (IREB), subject to the conditions stated below.",
      "",
      "Conditions:",
      "1. The research team must conduct the study in accordance with the approved protocol.",
      "2. Any amendments to the protocol must be submitted to the IREB for approval.",
      "3. The research team must obtain informed consent from participants using the approved consent form.",
      "",
      `Title of Research: ${params.title || "—"}`,
      `Principal researcher / applicant: ${params.applicantName}`,
    ],
    10,
  );

  writeLines(
    [
      "",
      "Regards,",
      "Institutional Review Ethical Board (IREB)",
      "The University of Lahore",
    ],
    10,
  );

  const arrayBuffer = pdf.output("arraybuffer") as ArrayBuffer;
  return Buffer.from(arrayBuffer);
}
