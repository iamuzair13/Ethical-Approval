import { buildAdminReleaseIrebEmail } from "./templates/admin-release-ireb";
import { getPublicAppUrl, isSmtpEnabled } from "./smtp-config";
import { sendMail } from "./send-mail";

/**
 * Notifies IREB members that the Administrator (IREB chairman) has released
 * an application for IREB review — either as a normal recommendation or as
 * a sensitive case. Sends one email per IREB recipient.
 */
export function scheduleAdminReleaseToIrebEmail(input: {
  irebEmails: string[];
  applicantName: string;
  title: string | null;
  applicationId: string;
  adminName: string;
  isSensitive: boolean;
}): void {
  if (!isSmtpEnabled()) return;
  const publicAppUrl = getPublicAppUrl();

  for (const rawTo of input.irebEmails) {
    const to = rawTo.trim();
    if (!to) continue;
    const payload = buildAdminReleaseIrebEmail({
      applicantName: input.applicantName,
      title: input.title,
      applicationId: input.applicationId,
      adminName: input.adminName,
      isSensitive: input.isSensitive,
      publicAppUrl,
    });
    void sendMail({ to, ...payload }).catch((err) => {
      console.error("[email] Administrator release -> IREB notification failed.", err);
    });
  }
}
