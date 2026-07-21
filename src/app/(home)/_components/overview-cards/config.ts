export type OverviewCardConfig = {
  key: OverviewMetricKey;
  label: string;
  prefix?: string;
};

export const OVERVIEW_CARDS_CONFIG: OverviewCardConfig[] = [
  { key: "views", label: "Total Requests" },
  { key: "profit", label: "Pending Approvals(Supervisor)",  },
  {
    key: "products",
    label: "Pending Approvals(IREB)",
  },
  { key: "users", label: "Approved (Supervisor)" },
  { key: "customers", label: "Approved (IREB)" },
  { key: "supervisorRejected", label: "Rejected (Supervisor)" },
  { key: "irebRejected", label: "Rejected (IREB)" },
] ;

export type OverviewMetricKey =
  | "views"
  | "profit"
  | "products"
  | "users"
  | "customers"
  | "supervisorPending"
  | "supervisorApproved"
  | "supervisorRejected"
  | "irebRejected";
