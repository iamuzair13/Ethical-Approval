import { buildHodApprovalAdminEmail } from "./templates/hod-approval-admin";
import { getPublicAppUrl, isSmtpEnabled } from "./smtp-config";
import { sendMail } from "./send-mail";

/**
 * Notifies the Administrator (IREB chairman) that a HOD has approved an
 * application and it is now ready for the Administrator review stage.
 * Sends one email per administrator recipient.
 */
export function scheduleHodApprovalToAdminEmail(input: {
  adminEmails: string[];
  applicantName: string;
  title: string | null;
  applicationId: string;
  hodName: string;
}): void {
  if (!isSmtpEnabled()) return;
  const publicAppUrl = getPublicAppUrl();

  for (const rawTo of input.adminEmails) {
    const to = rawTo.trim();
    if (!to) continue;
    const payload = buildHodApprovalAdminEmail({
      applicantName: input.applicantName,
      title: input.title,
      applicationId: input.applicationId,
      hodName: input.hodName,
      publicAppUrl,
    });
    void sendMail({ to, ...payload }).catch((err) => {
      console.error("[email] HOD approval -> Administrator notification failed.", err);
    });
  }
}
