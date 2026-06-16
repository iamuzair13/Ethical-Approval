export type LeadStatus =
  | "Submitted"
  | "Under Review by Dean"
  | "Approved by Dean"
  | "Rejected by Dean"
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
  stage: "dean" | "ireb" | "completed";
  submittedAt: string;
  deanDecisionAt: string | null;
  avatar: string | null;
  latestFeedbackComment?: string | null;
  latestAuditNote?: string | null;
  latestActionTrace?: string | null;
};

export type CountEntry = { value: string; count: number };

export type DecisionAction = "approved" | "rejected";

export type AdminOption = { id: string; name: string; role: "dean" | "ireb" };

export type SlotFileInfo = { displayName: string | null; hasStoredFile: boolean };
