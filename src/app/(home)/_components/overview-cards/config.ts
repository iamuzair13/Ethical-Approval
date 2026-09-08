export type OverviewCardConfig = {
  key: OverviewMetricKey;
  label: string;
  prefix?: string;
};

export const OVERVIEW_CARDS_CONFIG: OverviewCardConfig[] = [
  { key: "views", label: "Total Requests" },
  { key: "profit", label: "Pending Approvals(HOD)",  },
  {
    key: "products",
    label: "Pending Approvals(IREB)",
  },
  { key: "users", label: "Approved (HOD)" },
  { key: "customers", label: "Approved (IREB)" },
  { key: "hodRejected", label: "Rejected (HOD)" },
  { key: "irebRejected", label: "Rejected (IREB)" },
] ;

export type OverviewMetricKey =
  | "views"
  | "profit"
  | "products"
  | "users"
  | "customers"
  | "hodPending"
  | "hodApproved"
  | "hodRejected"
  | "irebRejected";
