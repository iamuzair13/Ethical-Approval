import { OverviewCard } from "@/app/(home)/_components/overview-cards/card";
import type { OverviewCardConfig } from "@/app/(home)/_components/overview-cards/config";
import { getOverviewData } from "@/app/(home)/fetch";
import { PaymentsOverview } from "@/components/Charts/payments-overview";
import {
  UsedDevices,
  type UsedDeviceDatum,
} from "@/components/Charts/used-devices";
import { LeadsReport } from "@/components/Tables/leads-report";
import { compactFormat } from "@/lib/format-number";
import { createTimeFrameExtractor } from "@/utils/timeframe-extractor";

type PropsType = {
  searchParams: Promise<{
    selected_time_frame?: string;
  }>;
};

const DEAN_CARDS_CONFIG: OverviewCardConfig[] = [
  { key: "views", label: "Total Ethical Requests" },
  { key: "profit", label: "Pending Approvals" },
  { key: "users", label: "Approved Requests" },
  { key: "products", label: "Rejected Requests" },
];

export default async function DeanPanel({ searchParams }: PropsType) {
  const { selected_time_frame } = await searchParams;
  const extractTimeFrame = createTimeFrameExtractor(selected_time_frame);
  const overviewData = await getOverviewData();

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

  const pendingDean = overviewData.profit.value;
  const approvedDean = overviewData.users.value;
  const rejectedDean = overviewData.products.value;
  const deanTotal = Math.max(pendingDean + approvedDean + rejectedDean, 1);
  const deanBreakdown: UsedDeviceDatum[] = [
    {
      name: "Pending",
      amount: pendingDean,
      percentage: Math.round((pendingDean / deanTotal) * 100),
    },
    {
      name: "Approved",
      amount: approvedDean,
      percentage: Math.round((approvedDean / deanTotal) * 100),
    },
    {
      name: "Rejected",
      amount: rejectedDean,
      percentage: Math.round((rejectedDean / deanTotal) * 100),
    },
  ];

  return (
    <>
      <div className="grid gap-4 sm:gap-6 2xl:gap-7.5">
        <OverviewCard items={items} />
      </div>

      <div className="mt-4 grid grid-cols-12 gap-4 md:mt-6 md:gap-6 2xl:mt-9 2xl:gap-7.5">
        <PaymentsOverview
          className="col-span-12 xl:col-span-7"
          key={extractTimeFrame("dean_payments_overview")}
          timeFrame={extractTimeFrame("dean_payments_overview")?.split(":")[1]}
          title="Approval Trends"
          cardsConfig={DEAN_CARDS_CONFIG}
        />

        <UsedDevices
          className="col-span-12 xl:col-span-5"
          key={extractTimeFrame("dean_used_devices")}
          timeFrame={extractTimeFrame("dean_used_devices")?.split(":")[1]}
          title="Decision Breakdown"
          sectionKey="dean_used_devices"
          data={deanBreakdown}
        />

        <LeadsReport
          deanOnly
          title="Ethical Requests Requiring Decision"
        />
      </div>
    </>
  );
}
