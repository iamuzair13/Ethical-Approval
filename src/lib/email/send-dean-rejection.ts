import { stripAdminAuditNote } from "@/lib/approval-comment-utils";
import { buildDeanRejectionEmail } from "./templates/dean-rejection";
import { getPublicAppUrl, isSmtpEnabled } from "./smtp-config";
import { sendMail } from "./send-mail";

export function scheduleDeanRejectionEmail(input: {
  to: string;
  applicantName: string;
  facultyName: string;
  deanName: string;
  comment: string | null;
}): void {
  const to = input.to.trim();
  if (!to) {
    console.warn("[email] Skipping dean rejection email: empty recipient.");
    return;
  }
  if (!isSmtpEnabled()) return;

  const rejectionReason = stripAdminAuditNote(input.comment) ?? "No reason was provided.";
  const publicAppUrl = getPublicAppUrl();
  const payload = buildDeanRejectionEmail({
    applicantName: input.applicantName,
    facultyName: input.facultyName,
    deanName: input.deanName,
    rejectionReason,
    publicAppUrl,
  });

  void sendMail({ to, ...payload }).catch((err) => {
    console.error("[email] Dean rejection email failed.", err);
  });
}
