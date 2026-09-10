import type { AdminApprovalInput, MailPayload } from "../types";
import { escapeHtml } from "../html-escape";

export function buildAdminApprovalEmail(input: AdminApprovalInput): MailPayload {
  const subject = `IERB Ethical Approval — Application Approved: ${input.applicationId}`;
  const loginLine = input.publicAppUrl
    ? `You can view the status of your application on the <a href="${escapeHtml(input.publicAppUrl)}">Ethical Review Process website</a>.`
    : "You can view the status of your application on the Ethical Review Process website.";

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Georgia, 'Times New Roman', serif; font-size: 15px; line-height: 1.5; color: #111;">
<p>Dear ${escapeHtml(input.applicantName)},</p>
<p>We are pleased to inform you that your Ethical Approval application has been approved by the Administrator (IREB Chairman).</p>
<ul>
  <li><strong>Application ID:</strong> ${escapeHtml(input.applicationId)}</li>
  <li><strong>Research Title:</strong> ${escapeHtml(input.title || "N/A")}</li>
</ul>
<p>${loginLine}</p>
<p>Regards,<br>
Institutional Review and Ethical Board (IREB)<br>
The University of Lahore</p>
</body>
</html>`.trim();

  const text = [
    `Dear ${input.applicantName},`,
    "",
    "We are pleased to inform you that your Ethical Approval application has been approved by the Administrator (IREB Chairman).",
    "",
    `Application ID: ${input.applicationId}`,
    `Research Title: ${input.title || "N/A"}`,
    "",
    input.publicAppUrl
      ? `You can view the status of your application on the Ethical Review Process website (${input.publicAppUrl}).`
      : "You can view the status of your application on the Ethical Review Process website.",
    "",
    "Regards,",
    "Institutional Review and Ethical Board (IREB)",
    "The University of Lahore",
  ].join("\n");

  return { subject, html, text };
}
