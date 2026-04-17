export type OverviewCardConfig = {
  key: OverviewMetricKey;
  label: string;
  prefix?: string;
};

export const OVERVIEW_CARDS_CONFIG: OverviewCardConfig[] = [
  { key: "views", label: "Total Requests Made" },
  { key: "profit", label: "Pending Approvals From Dean",  },
  {
    key: "products",
    label: "Pending Approvals From IREB",
  },
  { key: "users", label: "Approved Requests From Dean" },
  { key: "customers", label: "Approved Requests From IREB" },
] ;

export type OverviewMetricKey =
  | "views"
  | "profit"
  | "products"
  | "users"
  | "customers"
  | "deanPending"
  | "deanApproved";
