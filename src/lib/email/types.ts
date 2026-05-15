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

export type DeanRejectionInput = {
  applicantName: string;
  facultyName: string;
  deanName: string;
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
