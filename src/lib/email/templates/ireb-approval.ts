import type { IrebApprovalInput, MailPayload } from "../types";
import { escapeHtml } from "../html-escape";

export function buildIrebApprovalEmail(input: IrebApprovalInput): MailPayload {
  const subject = "IERB Ethical Approval Granted";
  const title = escapeHtml(input.title || "—");
  const researcher = escapeHtml(input.researcherName);
  const name = escapeHtml(input.applicantName);
  const approvalNo = escapeHtml(input.applicationId);

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Georgia, 'Times New Roman', serif; font-size: 15px; line-height: 1.5; color: #111;">
<p>Dear ${name},</p>
<p>We are pleased to inform you that your application has been successfully approved by the Institutional Review Ethical Board (IREB). The IREB has carefully reviewed your research proposal and is satisfied that it meets the ethical standards and guidelines. The approval has been granted under the following conditions:</p>
<ol>
<li>The research team must conduct the study in accordance with the approved protocol.</li>
<li>Any amendments to the protocol must be submitted to the IREB for approval.</li>
<li>The research team must obtain informed consent from participants using the approved consent form.</li>
</ol>
<p><strong>Title of Research:</strong> ${title}<br>
<strong>Researcher's Name:</strong> ${researcher}<br>
<strong>Ethical Approval Number:</strong> ${approvalNo}</p>
<p>Please find the attached Ethical Approval Letter for further details.</p>
<p>Regards,<br>
Institutional Review Ethical Board (IREB)<br>
The University of Lahore</p>
</body>
</html>`.trim();

  const text = [
    `Dear ${input.applicantName},`,
    "",
    "We are pleased to inform you that your application has been successfully approved by the Institutional Review Ethical Board (IREB). The IREB has carefully reviewed your research proposal and is satisfied that it meets the ethical standards and guidelines. The approval has been granted under the following conditions:",
    "",
    "1. The research team must conduct the study in accordance with the approved protocol.",
    "2. Any amendments to the protocol must be submitted to the IREB for approval.",
    "3. The research team must obtain informed consent from participants using the approved consent form.",
    "",
    `Title of Research: ${input.title || "—"}`,
    `Researcher's Name: ${input.researcherName}`,
    `Ethical Approval Number: ${input.applicationId}`,
    "",
    "Please find the attached Ethical Approval Letter for further details.",
    "",
    "Regards,",
    "Institutional Review Ethical Board (IREB)",
    "The University of Lahore",
  ].join("\n");

  return { subject, html, text };
}
