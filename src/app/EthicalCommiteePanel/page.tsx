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

const ETHICAL_CARDS_CONFIG: OverviewCardConfig[] = [
  { key: "views", label: "Total Requests" },
  { key: "products", label: "Pending Approvals" },
  { key: "users", label: "Approved Requests" },
  { key: "profit", label: "Rejected Requests" },
];

export default async function EthicalCommiteePanel({ searchParams }: PropsType) {
  const { selected_time_frame } = await searchParams;
  const extractTimeFrame = createTimeFrameExtractor(selected_time_frame);
  const overviewData = await getOverviewData();

  const items = ETHICAL_CARDS_CONFIG.map(({ key, label, prefix }) => {
    const metric = overviewData[key];

    return {
      label,
      data: {
        ...metric,
        value: `${prefix ?? ""}${compactFormat(metric.value)}`,
      },
    };
  });

  const pending = overviewData.products.value;
  const approved = overviewData.users.value;
  const rejected = overviewData.profit.value;
  const total = Math.max(pending + approved + rejected, 1);
  const ethicalBreakdown: UsedDeviceDatum[] = [
    {
      name: "Pending",
      amount: pending,
      percentage: Math.round((pending / total) * 100),
    },
    {
      name: "Approved",
      amount: approved,
      percentage: Math.round((approved / total) * 100),
    },
    {
      name: "Rejected",
      amount: rejected,
      percentage: Math.round((rejected / total) * 100),
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
          key={extractTimeFrame("ethical_payments_overview")}
          timeFrame={extractTimeFrame("ethical_payments_overview")?.split(":")[1]}
          title="Approval Trends"
          cardsConfig={ETHICAL_CARDS_CONFIG}
        />

        <UsedDevices
          className="col-span-12 xl:col-span-5"
          key={extractTimeFrame("ethical_used_devices")}
          timeFrame={extractTimeFrame("ethical_used_devices")?.split(":")[1]}
          title="Decision Breakdown"
          sectionKey="ethical_used_devices"
          data={ethicalBreakdown}
        />

        <LeadsReport
          ethicalOnly
          title="IREB Decision"
        />
      </div>
    </>
  );
}
