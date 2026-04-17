import { OverviewCard } from "@/app/(home)/_components/overview-cards/card";
import type { OverviewCardConfig } from "@/app/(home)/_components/overview-cards/config";
import {
  getDashboardLeads,
  getOverviewData,
  getUsedDevicesData,
} from "@/app/(home)/fetch";
import { PaymentsOverview } from "@/components/Charts/payments-overview";
import {
  UsedDevices,
} from "@/components/Charts/used-devices";
import { LeadsReport } from "@/components/Tables/leads-report";
import DashboardApiProbe from "@/components/debug/dashboard-api-probe";
import DashboardLiveRefresh from "@/components/debug/dashboard-live-refresh";
import { compactFormat } from "@/lib/format-number";
import { authOptions } from "@/lib/auth-options";
import { createTimeFrameExtractor } from "@/utils/timeframe-extractor";
import { getServerSession } from "next-auth";

type PropsType = {
  searchParams: Promise<{
    selected_time_frame?: string;
  }>;
};

const DEAN_CARDS_CONFIG: OverviewCardConfig[] = [
  { key: "views", label: "Total Ethical Requests" },
  { key: "profit", label: "Pending Approvals" },
  { key: "users", label: "Approved Requests" },
  { key: "customers", label: "Rejected Requests" },
];

export default async function DeanPanel({ searchParams }: PropsType) {
  const { selected_time_frame } = await searchParams;
  const extractTimeFrame = createTimeFrameExtractor(selected_time_frame);
  const session = await getServerSession(authOptions);
  if (!session) return null;
  const [overviewData, leadsData, usedDevicesData] = await Promise.all([
    getOverviewData(session),
    getDashboardLeads(session),
    getUsedDevicesData(session),
  ]);

  const items = DEAN_CARDS_CONFIG.map(({ key, label, prefix }) => {
    const metric = overviewData[key];

    return {
      label,
      data: {
        ...metric,
        value: `${prefix ?? ""}${compactFormat(metric.value)}`,
      },
    };
  });

  const rejectedDean =
    usedDevicesData.find((item) => item.name === "Rejected by Dean")?.amount ?? 0;
  const deanItems = DEAN_CARDS_CONFIG.map(({ key, label, prefix }) => {
    const metric = overviewData[key];
    const value =
      key === "customers"
        ? rejectedDean
        : typeof metric.value === "number"
          ? metric.value
          : Number(metric.value) || 0;
    return {
      label,
      data: {
        ...metric,
        value: `${prefix ?? ""}${compactFormat(value)}`,
      },
    };
  });

  return (
    <>
      <DashboardApiProbe tag="dean" />
      <DashboardLiveRefresh />
      <div className="grid gap-4 sm:gap-6 2xl:gap-7.5">
        <OverviewCard items={deanItems} />
      </div>

      <div className="mt-4 grid grid-cols-12 gap-4 md:mt-6 md:gap-6 2xl:mt-9 2xl:gap-7.5">
        <PaymentsOverview
          className="col-span-12 xl:col-span-7"
          key={extractTimeFrame("dean_payments_overview")}
          timeFrame={extractTimeFrame("dean_payments_overview")?.split(":")[1]}
          title="Approval Trends"
          cardsConfig={DEAN_CARDS_CONFIG}
          overviewData={{
            ...overviewData,
            customers: {
              value: rejectedDean,
              growthRate:
                overviewData.views.value > 0
                  ? Math.round((rejectedDean / overviewData.views.value) * 100)
                  : 0,
            },
          }}
        />

        <UsedDevices
          className="col-span-12 xl:col-span-5"
          key={extractTimeFrame("dean_used_devices")}
          timeFrame={extractTimeFrame("dean_used_devices")?.split(":")[1]}
          title="Decision Breakdown"
          sectionKey="dean_used_devices"
          data={usedDevicesData}
        />

        <LeadsReport
          title="Ethical Requests Requiring Decision"
          leads={leadsData}
          currentRole="dean"
        />
      </div>
    </>
  );
}
