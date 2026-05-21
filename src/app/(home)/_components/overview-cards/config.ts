export type OverviewCardConfig = {
  key: OverviewMetricKey;
  label: string;
  prefix?: string;
};

export const OVERVIEW_CARDS_CONFIG: OverviewCardConfig[] = [
  { key: "views", label: "Total Requests" },
  { key: "profit", label: "Pending Approvals(Dean)",  },
  {
    key: "products",
    label: "Pending Approvals(IREB)",
  },
  { key: "users", label: "Approved (Dean)" },
  { key: "customers", label: "Approved (IREB)" },
  { key: "deanRejected", label: "Rejected (Dean)" },
  { key: "irebRejected", label: "Rejected (IREB)" },
] ;

export type OverviewMetricKey =
  | "views"
  | "profit"
  | "products"
  | "users"
  | "customers"
  | "deanPending"
  | "deanApproved"
  | "deanRejected"
  | "irebRejected";
