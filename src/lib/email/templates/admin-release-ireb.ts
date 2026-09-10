import type { AdminReleaseIrebInput, MailPayload } from "../types";
import { escapeHtml } from "../html-escape";

export function buildAdminReleaseIrebEmail(input: AdminReleaseIrebInput): MailPayload {
  const sensitiveLabel = input.isSensitive ? " (Sensitive Case)" : "";
  const subject = `IERB Ethical Approval — Administrator Released${sensitiveLabel}: ${input.applicationId}`;
  const loginLine = input.publicAppUrl
    ? `Please log in to the <a href="${escapeHtml(input.publicAppUrl)}">Ethical Review Process website</a> to review this application.`
    : "Please log in to the Ethical Review Process website to review this application.";

  const intro = input.isSensitive
    ? "The Administrator (IREB Chairman) has reviewed an Ethical Approval application and released it as a <strong>sensitive case</strong> for IREB review."
    : "The Administrator (IREB Chairman) has recommended an Ethical Approval application and it is now ready for IREB review.";

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Georgia, 'Times New Roman', serif; font-size: 15px; line-height: 1.5; color: #111;">
<p>Dear IREB Member,</p>
<p>${intro}</p>
<ul>
  <li><strong>Application ID:</strong> ${escapeHtml(input.applicationId)}</li>
  <li><strong>Applicant:</strong> ${escapeHtml(input.applicantName)}</li>
  <li><strong>Research Title:</strong> ${escapeHtml(input.title || "N/A")}</li>
  <li><strong>Released by:</strong> ${escapeHtml(input.adminName)}</li>
  ${input.isSensitive ? '<li><strong>Sensitive:</strong> Yes</li>' : ""}
</ul>
<p>${loginLine}</p>
<p>Regards,<br>
Institutional Review and Ethical Board (IREB)<br>
The University of Lahore</p>
</body>
</html>`.trim();

  const text = [
    "Dear IREB Member,",
    "",
    input.isSensitive
      ? "The Administrator (IREB Chairman) has reviewed an Ethical Approval application and released it as a sensitive case for IREB review."
      : "The Administrator (IREB Chairman) has recommended an Ethical Approval application and it is now ready for IREB review.",
    "",
    `Application ID: ${input.applicationId}`,
    `Applicant: ${input.applicantName}`,
    `Research Title: ${input.title || "N/A"}`,
    `Released by: ${input.adminName}`,
    input.isSensitive ? "Sensitive: Yes" : "",
    "",
    input.publicAppUrl
      ? `Please log in to the Ethical Review Process website (${input.publicAppUrl}) to review this application.`
      : "Please log in to the Ethical Review Process website to review this application.",
    "",
    "Regards,",
    "Institutional Review and Ethical Board (IREB)",
    "The University of Lahore",
  ].filter(Boolean).join("\n");

  return { subject, html, text };
}
