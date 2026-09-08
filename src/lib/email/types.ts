export type MailPayload = {
  subject: string;
  html: string;
  text: string;
};

export type SubmissionConfirmationInput = {
  applicantName: string;
  applicationId: string;
  submittedAt: Date;
  publicAppUrl?: string;
};

export type HodRejectionInput = {
  applicantName: string;
  facultyName: string;
  hodName: string;
  rejectionReason: string;
  publicAppUrl?: string;
};

export type IrebRejectionInput = {
  applicantName: string;
  rejectionReason: string;
  publicAppUrl?: string;
};

export type IrebApprovalInput = {
  applicantName: string;
  title: string;
  researcherName: string;
  applicationId: string;
  publicAppUrl?: string;
};

export type HodApprovalIrebInput = {
  applicantName: string;
  title: string | null;
  applicationId: string;
  hodName: string;
  publicAppUrl?: string;
};
