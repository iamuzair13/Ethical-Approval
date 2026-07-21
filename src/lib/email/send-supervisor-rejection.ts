import { stripAdminAuditNote } from "@/lib/approval-comment-utils";
import { buildSupervisorRejectionEmail } from "./templates/supervisor-rejection";
import { getPublicAppUrl, isSmtpEnabled } from "./smtp-config";
import { sendMail } from "./send-mail";

export function scheduleSupervisorRejectionEmail(input: {
  to: string;
  applicantName: string;
  facultyName: string;
  supervisorName: string;
  comment: string | null;
}): void {
  const to = input.to.trim();
  if (!to) {
    console.warn("[email] Skipping supervisor rejection email: empty recipient.");
    return;
  }
  if (!isSmtpEnabled()) return;

  const rejectionReason = stripAdminAuditNote(input.comment) ?? "No reason was provided.";
  const publicAppUrl = getPublicAppUrl();
  const payload = buildSupervisorRejectionEmail({
    applicantName: input.applicantName,
    facultyName: input.facultyName,
    supervisorName: input.supervisorName,
    rejectionReason,
    publicAppUrl,
  });

  void sendMail({ to, ...payload }).catch((err) => {
    console.error("[email] Supervisor rejection email failed.", err);
  });
}
