import { stripAdminAuditNote } from "@/lib/approval-comment-utils";
import { buildIrebRejectionEmail } from "./templates/ireb-rejection";
import { getPublicAppUrl, isSmtpEnabled } from "./smtp-config";
import { sendMail } from "./send-mail";

export function scheduleIrebRejectionEmail(input: {
  to: string;
  applicantName: string;
  comment: string | null;
}): void {
  const to = input.to.trim();
  if (!to) {
    console.warn("[email] Skipping IREB rejection email: empty recipient.");
    return;
  }
  if (!isSmtpEnabled()) return;

  const rejectionReason = stripAdminAuditNote(input.comment) ?? "No reason was provided.";
  const publicAppUrl = getPublicAppUrl();
  const payload = buildIrebRejectionEmail({
    applicantName: input.applicantName,
    rejectionReason,
    publicAppUrl,
  });

  void sendMail({ to, ...payload }).catch((err) => {
    console.error("[email] IREB rejection email failed.", err);
  });
}
