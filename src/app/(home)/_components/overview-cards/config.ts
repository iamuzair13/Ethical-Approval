export type OverviewCardConfig = {
  key: OverviewMetricKey;
  label: string;
  prefix?: string;
};

export const OVERVIEW_CARDS_CONFIG: OverviewCardConfig[] = [
  { key: "views", label: "Total Requests Made" },
  { key: "profit", label: "Pending Approvals From Dean", prefix: "$" },
  {
    key: "products",
    label: "Pending Approvals From Ethical Commitee",
  },
  { key: "users", label: "Approved Requests From Dean" },
  { key: "users", label: "Approved Requests From Ethical Commitee" },
] ;

export type OverviewMetricKey = "views" | "profit" | "products" | "users";
