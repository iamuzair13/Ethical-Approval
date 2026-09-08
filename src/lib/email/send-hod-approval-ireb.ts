import { buildHodApprovalIrebEmail } from "./templates/hod-approval-ireb";
import { getPublicAppUrl, isSmtpEnabled } from "./smtp-config";
import { sendMail } from "./send-mail";

/**
 * Notifies IREB members that a hod has approved an application and it
 * is now ready for IREB review. Sends one email per IREB recipient.
 */
export function scheduleHodApprovalToIrebEmail(input: {
  irebEmails: string[];
  applicantName: string;
  title: string | null;
  applicationId: string;
  hodName: string;
}): void {
  if (!isSmtpEnabled()) return;
  const publicAppUrl = getPublicAppUrl();

  for (const rawTo of input.irebEmails) {
    const to = rawTo.trim();
    if (!to) continue;
    const payload = buildHodApprovalIrebEmail({
      applicantName: input.applicantName,
      title: input.title,
      applicationId: input.applicationId,
      hodName: input.hodName,
      publicAppUrl,
    });
    void sendMail({ to, ...payload }).catch((err) => {
      console.error("[email] HOD approval -> IREB notification failed.", err);
    });
  }
}
