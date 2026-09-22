export type LeadStatus =
  | "Submitted"
  | "Under Review by HOD"
  | "Approved by HOD"
  | "Rejected by HOD"
  | "Under Review by Administrator"
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
  hodName?: string | null;
  stage: "hod" | "admin" | "ireb" | "completed";
  isSensitive?: boolean;
  /** Name of the IREB member this was recommended to (admin recommendation). */
  assignedIrebName?: string | null;
  submittedAt: string;
  hodDecisionAt: string | null;
  avatar: string | null;
  latestFeedbackComment?: string | null;
  latestAuditNote?: string | null;
  latestActionTrace?: string | null;
};

export type CountEntry = { value: string; count: number };

export type LeadsTab =
  | "all"
  | "overdue"
  | "approved"
  | "pending"
  | "rejected"
  | "adminAction";

export type DecisionAction = "approved" | "rejected";

export type AdminOption = { id: string; name: string; role: "hod" | "ireb" };

export type SlotFileInfo = { displayName: string | null; hasStoredFile: boolean };
