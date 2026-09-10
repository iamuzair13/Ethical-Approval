import { buildAdminApprovalEmail } from "./templates/admin-approval";
import { getPublicAppUrl, isSmtpEnabled } from "./smtp-config";
import { sendMail } from "./send-mail";

export function scheduleAdminApprovalEmail(input: {
  to: string;
  applicantName: string;
  title: string | null;
  applicationId: string;
  approvedAt: Date;
}): void {
  const to = input.to.trim();
  if (!to) {
    console.warn("[email] Skipping Administrator approval email: empty recipient.");
    return;
  }
  if (!isSmtpEnabled()) return;

  const publicAppUrl = getPublicAppUrl();
  const payload = buildAdminApprovalEmail({
    applicantName: input.applicantName,
    title: input.title,
    applicationId: input.applicationId,
    publicAppUrl,
  });

  void sendMail({ to, ...payload }).catch((err) => {
    console.error("[email] Administrator approval email failed.", err);
  });
}
