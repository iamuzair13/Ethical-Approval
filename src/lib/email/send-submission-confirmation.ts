import { buildSubmissionConfirmationEmail } from "./templates/submission-confirmation";
import { getPublicAppUrl, isSmtpEnabled } from "./smtp-config";
import { sendMail } from "./send-mail";

export function scheduleSubmissionConfirmationEmail(input: {
  to: string;
  applicantName: string;
  applicationId: string;
  submittedAt: Date;
}): void {
  const to = input.to.trim();
  if (!to) {
    console.warn("[email] Skipping submission confirmation: empty recipient.");
    return;
  }
  if (!isSmtpEnabled()) return;

  const publicAppUrl = getPublicAppUrl();
  const payload = buildSubmissionConfirmationEmail({
    applicantName: input.applicantName,
    applicationId: input.applicationId,
    submittedAt: input.submittedAt,
    publicAppUrl,
  });

  void sendMail({ to, ...payload }).catch((err) => {
    console.error("[email] Submission confirmation failed.", err);
  });
}
