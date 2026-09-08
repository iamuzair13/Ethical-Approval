import { stripAdminAuditNote } from "@/lib/approval-comment-utils";
import { buildHodRejectionEmail } from "./templates/hod-rejection";
import { getPublicAppUrl, isSmtpEnabled } from "./smtp-config";
import { sendMail } from "./send-mail";

export function scheduleHodRejectionEmail(input: {
  to: string;
  applicantName: string;
  facultyName: string;
  hodName: string;
  comment: string | null;
}): void {
  const to = input.to.trim();
  if (!to) {
    console.warn("[email] Skipping hod rejection email: empty recipient.");
    return;
  }
  if (!isSmtpEnabled()) return;

  const rejectionReason = stripAdminAuditNote(input.comment) ?? "No reason was provided.";
  const publicAppUrl = getPublicAppUrl();
  const payload = buildHodRejectionEmail({
    applicantName: input.applicantName,
    facultyName: input.facultyName,
    hodName: input.hodName,
    rejectionReason,
    publicAppUrl,
  });

  void sendMail({ to, ...payload }).catch((err) => {
    console.error("[email] HOD rejection email failed.", err);
  });
}
