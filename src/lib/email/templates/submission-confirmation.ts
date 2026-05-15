import dayjs from "dayjs";
import type { MailPayload, SubmissionConfirmationInput } from "../types";
import { escapeHtml } from "../html-escape";

export function buildSubmissionConfirmationEmail(input: SubmissionConfirmationInput): MailPayload {
  const subject = "IREB Application Submission Confirmation";
  const dateStr = dayjs(input.submittedAt).format("MMMM D, YYYY");
  const name = escapeHtml(input.applicantName);
  const ref = escapeHtml(input.applicationId);
  const loginLine = input.publicAppUrl
    ? `You may track the progress and status of your application on the dashboard by logging in to your account through the <a href="${escapeHtml(input.publicAppUrl)}">Ethical Review Process website</a>.`
    : "You may track the progress and status of your application on the dashboard by logging in to your account through the Ethical Review Process website.";

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Georgia, 'Times New Roman', serif; font-size: 15px; line-height: 1.5; color: #111;">
<p>Dear ${name},</p>
<p>This is to confirm that your application for the Institutional Review Ethical Board (IREB) has been successfully submitted on ${escapeHtml(dateStr)}.</p>
<p><strong>Your Reference Number is:</strong> ${ref}</p>
<p>${loginLine}</p>
<p>Thank you.</p>
<p>Regards,<br>
Institutional Review Ethical Board (IREB)<br>
The University of Lahore</p>
</body>
</html>`.trim();

  const loginText = input.publicAppUrl
    ? `You may track the progress and status of your application on the dashboard by logging in to your account through the Ethical Review Process website (${input.publicAppUrl}).`
    : "You may track the progress and status of your application on the dashboard by logging in to your account through the Ethical Review Process website.";

  const text = [
    `Dear ${input.applicantName},`,
    "",
    `This is to confirm that your application for the Institutional Review Ethical Board (IREB) has been successfully submitted on ${dateStr}.`,
    "",
    `Your Reference Number is: ${input.applicationId}`,
    "",
    loginText,
    "",
    "Thank you.",
    "",
    "Regards,",
    "Institutional Review Ethical Board (IREB)",
    "The University of Lahore",
  ].join("\n");

  return { subject, html, text };
}
