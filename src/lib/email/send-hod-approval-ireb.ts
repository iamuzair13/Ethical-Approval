import { buildSupervisorApprovalIrebEmail } from "./templates/supervisor-approval-ireb";
import { getPublicAppUrl, isSmtpEnabled } from "./smtp-config";
import { sendMail } from "./send-mail";

/**
 * Notifies IREB members that a supervisor has approved an application and it
 * is now ready for IREB review. Sends one email per IREB recipient.
 */
export function scheduleSupervisorApprovalToIrebEmail(input: {
  irebEmails: string[];
  applicantName: string;
  title: string | null;
  applicationId: string;
  supervisorName: string;
}): void {
  if (!isSmtpEnabled()) return;
  const publicAppUrl = getPublicAppUrl();

  for (const rawTo of input.irebEmails) {
    const to = rawTo.trim();
    if (!to) continue;
    const payload = buildSupervisorApprovalIrebEmail({
      applicantName: input.applicantName,
      title: input.title,
      applicationId: input.applicationId,
      supervisorName: input.supervisorName,
      publicAppUrl,
    });
    void sendMail({ to, ...payload }).catch((err) => {
      console.error("[email] Supervisor approval -> IREB notification failed.", err);
    });
  }
}
