import type { IrebRejectionInput, MailPayload } from "../types";
import { escapeHtml, plainTextToHtmlParagraphs } from "../html-escape";

export function buildIrebRejectionEmail(input: IrebRejectionInput): MailPayload {
  const subject = "IERB Ethical Approval Application Rejected (IREB)";
  const reasonsHtml = plainTextToHtmlParagraphs(input.rejectionReason);
  const loginLine = input.publicAppUrl
    ? `Please log in to your account on the <a href="${escapeHtml(input.publicAppUrl)}">Ethical Review Process website</a> and respond to the queries raised on your dashboard.`
    : "Please log in to your account on the Ethical Review Process website and respond to the queries raised on your dashboard.";

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Georgia, 'Times New Roman', serif; font-size: 15px; line-height: 1.5; color: #111;">
<p>Dear ${escapeHtml(input.applicantName)},</p>
<p>We are writing to inform you that your Ethical Approval application has been returned. There were some discrepancies found in the data, due to which IREB has returned your application. The reason(s) for application rejection is as follow:</p>
${reasonsHtml}
<p>${loginLine}</p>
<p>Kindly resubmit the application with the required corrections and necessary information.</p>
<p>Thank you.</p>
<p>Regards,<br>
Institutional Review and Ethical Board (IREB)<br>
The University of Lahore</p>
</body>
</html>`.trim();

  const text = [
    `Dear ${input.applicantName},`,
    "",
    "We are writing to inform you that your Ethical Approval application has been returned. There were some discrepancies found in the data, due to which IREB has returned your application. The reason(s) for application rejection is as follow:",
    "",
    input.rejectionReason,
    "",
    input.publicAppUrl
      ? `Please log in to your account on the Ethical Review Process website (${input.publicAppUrl}) and respond to the queries raised on your dashboard.`
      : "Please log in to your account on the Ethical Review Process website and respond to the queries raised on your dashboard.",
    "",
    "Kindly resubmit the application with the required corrections and necessary information.",
    "",
    "Thank you.",
    "",
    "Regards,",
    "Institutional Review and Ethical Board (IREB)",
    "The University of Lahore",
  ].join("\n");

  return { subject, html, text };
}
