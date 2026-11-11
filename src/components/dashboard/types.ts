// Shared dashboard types + pure helpers (no "use client" — safe to import
// from both server and client components).

export type DatePreset = "7d" | "30d" | "90d" | "year" | "custom";

export type DashboardFilterState = {
  preset: DatePreset;
  from: string; // yyyy-mm-dd
  to: string; // yyyy-mm-dd
  facultyId?: number;
  departmentId?: number;
  programId?: number;
  track?: TrackKey;
};

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function rangeForPreset(
  preset: DatePreset,
  now = new Date(),
): { from: string; to: string } {
  const to = isoDate(now);
  if (preset === "year") {
    return { from: isoDate(new Date(now.getFullYear(), 0, 1)), to };
  }
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  return { from: isoDate(new Date(now.getTime() - days * 86400000)), to };
}

export function defaultFilterState(now = new Date()): DashboardFilterState {
  return { preset: "90d", ...rangeForPreset("90d", now) };
}

// The types below mirror src/lib/dashboard-summary.ts — duplicated here so
// client components never import the server module.
export type TrackKey = "student_thesis" | "student_publication" | "faculty_publication";
export type StageKey = "hod" | "admin" | "ireb";
export type TrendGranularity = "day" | "week" | "month";

export type DeciderOutcome = {
  key: StageKey;
  label: string;
  pending: number;
  approved: number;
  rejected: number;
  forwarded: number;
  decided: number;
  approvalRate: number | null;
  rejectionRate: number | null;
};

export type TrendPoint = {
  label: string;
  submitted: number;
  approved: number;
  rejected: number;
};

export type TrackSummary = {
  track: TrackKey;
  label: string;
  forms: string;
  stages: StageKey[];
  total: number;
  stageCounts: Partial<Record<StageKey, number>>;
  funnel: { stage: StageKey; entered: number }[];
  deciders: DeciderOutcome[];
  outcomes: { pending: number; approved: number; rejected: number };
  trend: TrendPoint[];
  aging: {
    avgDays: number | null;
    medianDays: number | null;
    overThreshold: number;
    thresholdDays: number;
  };
  agingByStage: Partial<Record<
    StageKey,
    { count: number; avgDays: number | null; overThreshold: number }
  >>;
  avgDaysToDecision: number | null;
  sensitiveCount: number;
  unassignedIrebCount: number;
};

export type NeedsAttentionItem = {
  id: number;
  applicationId: string;
  title: string;
  applicantName: string;
  track: TrackKey;
  stage: StageKey;
  daysWaiting: number;
  assignedIrebName: string | null;
};

export type DashboardSummary = {
  range: { from: string; to: string; granularity: TrendGranularity };
  tracks: Record<TrackKey, TrackSummary>;
  needsAttention: NeedsAttentionItem[];
  invariantOk: boolean;
  generatedAt: string;
};

export type FilterOption = { id: number; name: string };
export type DepartmentOption = FilterOption & { facultyId: number; facultyName: string };
export type ProgramOption = FilterOption & { departmentId: number; departmentName: string };

export type FilterOptions = {
  faculties: FilterOption[];
  departments: DepartmentOption[];
  programs: ProgramOption[];
};

export const TRACK_ORDER: TrackKey[] = [
  "student_thesis",
  "student_publication",
  "faculty_publication",
];

export const TRACK_LABELS: Record<TrackKey, string> = {
  student_thesis: "Student Thesis",
  student_publication: "Student Publication",
  faculty_publication: "Faculty Publication",
};

export const STAGE_LABELS: Record<StageKey, string> = {
  hod: "HOD Review",
  admin: "Admin Review",
  ireb: "IREB Review",
};

// Consistent color semantics: amber=pending, green=approved, red=rejected, indigo=total.
export const COLOR_PENDING = "#f59e0b";
export const COLOR_APPROVED = "#10b981";
export const COLOR_REJECTED = "#f43f5e";
export const COLOR_TOTAL = "#5750f1";
