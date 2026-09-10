import type { HodApprovalAdminInput, MailPayload } from "../types";
import { escapeHtml } from "../html-escape";

export function buildHodApprovalAdminEmail(
  input: HodApprovalAdminInput,
): MailPayload {
  const subject = `IERB Ethical Approval — HOD Approved: ${input.applicationId}`;
  const loginLine = input.publicAppUrl
    ? `Please log in to the <a href="${escapeHtml(input.publicAppUrl)}">Ethical Review Process website</a> to review this application.`
    : "Please log in to the Ethical Review Process website to review this application.";

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Georgia, 'Times New Roman', serif; font-size: 15px; line-height: 1.5; color: #111;">
<p>Dear Administrator,</p>
<p>A HOD has approved an Ethical Approval application and it is now ready for Administrator review.</p>
<ul>
  <li><strong>Application ID:</strong> ${escapeHtml(input.applicationId)}</li>
  <li><strong>Applicant:</strong> ${escapeHtml(input.applicantName)}</li>
  <li><strong>Research Title:</strong> ${escapeHtml(input.title || "N/A")}</li>
  <li><strong>HOD:</strong> ${escapeHtml(input.hodName)}</li>
</ul>
<p>${loginLine}</p>
<p>Regards,<br>
Institutional Review and Ethical Board (IREB)<br>
The University of Lahore</p>
</body>
</html>`.trim();

  const text = [
    "Dear Administrator,",
    "",
    "A HOD has approved an Ethical Approval application and it is now ready for Administrator review.",
    "",
    `Application ID: ${input.applicationId}`,
    `Applicant: ${input.applicantName}`,
    `Research Title: ${input.title || "N/A"}`,
    `HOD: ${input.hodName}`,
    "",
    input.publicAppUrl
      ? `Please log in to the Ethical Review Process website (${input.publicAppUrl}) to review this application.`
      : "Please log in to the Ethical Review Process website to review this application.",
    "",
    "Regards,",
    "Institutional Review and Ethical Board (IREB)",
    "The University of Lahore",
  ].join("\n");

  return { subject, html, text };
}
