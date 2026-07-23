export type LeadStatus =
  | "Submitted"
  | "Under Review by Supervisor"
  | "Approved by Supervisor"
  | "Rejected by Supervisor"
  | "Under Review by IREB"
  | "Approved by IREB"
  | "Rejected by IREB";

export type Lead = {
  id: number;
  applicationId: string;
  name: string;
  email: string;
  applicationType: string;
  researchTitle: string;
  faculty: string;
  department: string;
  project: string;
  duration: string;
  currentStatus: LeadStatus;
  supervisorName?: string | null;
  stage: "supervisor" | "ireb" | "completed";
  submittedAt: string;
  supervisorDecisionAt: string | null;
  avatar: string | null;
  latestFeedbackComment?: string | null;
  latestAuditNote?: string | null;
  latestActionTrace?: string | null;
};

export type CountEntry = { value: string; count: number };

export type DecisionAction = "approved" | "rejected";

export type AdminOption = { id: string; name: string; role: "supervisor" | "ireb" };

export type SlotFileInfo = { displayName: string | null; hasStoredFile: boolean };
