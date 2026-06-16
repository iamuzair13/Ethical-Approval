import * as XLSX from "xlsx";

/** Row shape aligned with `Lead` in the leads report table. */
export type LeadsReportExcelLead = {
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
  currentStatus: string;
  stage: string;
  avatar: string | null;
  latestFeedbackComment?: string | null;
  latestAuditNote?: string | null;
  latestActionTrace?: string | null;
};

export type LeadsReportExcelMeta = {
  reportTitle: string;
  generatedAt: Date;
  activeTab: "all" | "overdue";
  searchQuery: string;
  facultyFilter: string[];
  departmentFilter: string[];
  currentStatusFilter: string[];
  deanOnly: boolean;
  ethicalOnly: boolean;
  /** Rows in scope before search / dropdown filters (same base as filter counts). */
  scopeDatasetSize: number;
};

export const LEADS_EXCEL_COLUMNS: readonly {
  id: string;
  header: string;
  defaultSelected: boolean;
  getValue: (lead: LeadsReportExcelLead) => string;
}[] = [
  {
    id: "applicationId",
    header: "Application ID",
    defaultSelected: true,
    getValue: (l) => l.applicationId,
  },
  { id: "name", header: "Name", defaultSelected: true, getValue: (l) => l.name },
  { id: "email", header: "Email", defaultSelected: true, getValue: (l) => l.email },
  {
    id: "applicationType",
    header: "Application Type",
    defaultSelected: true,
    getValue: (l) => l.applicationType,
  },
  {
    id: "researchTitle",
    header: "Title",
    defaultSelected: true,
    getValue: (l) => l.researchTitle,
  },
  { id: "faculty", header: "Faculty", defaultSelected: true, getValue: (l) => l.faculty },
  { id: "department", header: "Department", defaultSelected: true, getValue: (l) => l.department },
  {
    id: "currentStatus",
    header: "Current Status",
    defaultSelected: true,
    getValue: (l) => l.currentStatus,
  },
  {
    id: "responseIn",
    header: "Response In",
    defaultSelected: true,
    getValue: (l) => l.project,
  },
  { id: "duration", header: "Duration", defaultSelected: true, getValue: (l) => l.duration },
  { id: "stage", header: "Stage", defaultSelected: true, getValue: (l) => l.stage },
  {
    id: "latestFeedbackComment",
    header: "Latest feedback",
    defaultSelected: false,
    getValue: (l) => l.latestFeedbackComment ?? "",
  },
  {
    id: "latestAuditNote",
    header: "Latest audit note",
    defaultSelected: false,
    getValue: (l) => l.latestAuditNote ?? "",
  },
  {
    id: "latestActionTrace",
    header: "Latest action trace",
    defaultSelected: false,
    getValue: (l) => l.latestActionTrace ?? "",
  },
  {
    id: "avatar",
    header: "Avatar URL",
    defaultSelected: false,
    getValue: (l) => l.avatar ?? "",
  },
];

export function defaultLeadsExcelColumnSelection(): Record<string, boolean> {
  return Object.fromEntries(LEADS_EXCEL_COLUMNS.map((c) => [c.id, c.defaultSelected]));
}

function cellText(value: string): string {
  return String(value ?? "").replace(/\r\n/g, "\n").trimEnd();
}

/**
 * Writes a single-sheet workbook: metadata rows, blank row, header, then all `leads` rows.
 */
export function downloadLeadsReportExcel(
  leads: LeadsReportExcelLead[],
  selectedColumnIds: string[],
  meta: LeadsReportExcelMeta,
): void {
  const cols = LEADS_EXCEL_COLUMNS.filter((c) => selectedColumnIds.includes(c.id));
  if (cols.length === 0) {
    throw new Error("Select at least one column.");
  }

  const scopeLabel = meta.deanOnly
    ? "Dean stage only"
    : meta.ethicalOnly
      ? "IREB stage only"
      : "Full list";

  
  const headerRow = cols.map((c) => c.header);
  const dataRows = leads.map((lead) => cols.map((c) => cellText(c.getValue(lead))));

  const aoa: (string | number)[][] = [headerRow, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Leads");
  const stamp = meta.generatedAt.toISOString().slice(0, 19).replace(/[:T]/g, "-");
  XLSX.writeFile(wb, `leads-report-${stamp}.xlsx`);
}
