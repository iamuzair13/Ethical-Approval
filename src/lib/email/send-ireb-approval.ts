import { buildIrebApprovalEmail } from "./templates/ireb-approval";
import { buildEthicalApprovalLetterPdf } from "./ethics-approval-letter-pdf";
import { getPublicAppUrl, isSmtpEnabled } from "./smtp-config";
import { sendMail } from "./send-mail";

export function scheduleIrebApprovalEmail(input: {
  to: string;
  applicantName: string;
  title: string | null;
  applicationId: string;
  approvedAt: Date;
}): void {
  const to = input.to.trim();
  if (!to) {
    console.warn("[email] Skipping IREB approval email: empty recipient.");
    return;
  }
  if (!isSmtpEnabled()) return;

  const publicAppUrl = getPublicAppUrl();
  const researcherName = input.applicantName;
  const payload = buildIrebApprovalEmail({
    applicantName: input.applicantName,
    title: input.title ?? "",
    researcherName,
    applicationId: input.applicationId,
    publicAppUrl,
  });

  const pdfBuffer = buildEthicalApprovalLetterPdf({
    applicationId: input.applicationId,
    applicantName: input.applicantName,
    title: input.title ?? "",
    approvalDate: input.approvedAt,
  });

  const filename = `Ethical-Approval-Letter-${input.applicationId}.pdf`;

  void sendMail({
    to,
    ...payload,
    attachments: [
      {
        filename,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  }).catch((err) => {
    console.error("[email] IREB approval email failed.", err);
  });
}
