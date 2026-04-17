import { PeriodPicker } from "@/components/period-picker";
import { standardFormat } from "@/lib/format-number";
import { cn } from "@/lib/utils";
import {
  OVERVIEW_CARDS_CONFIG,
  type OverviewCardConfig,
} from "@/app/(home)/_components/overview-cards/config";
import { getOverviewData, type OverviewData } from "@/app/(home)/fetch";
import { PaymentsOverviewChart } from "./chart";

type PropsType = {
  timeFrame?: string;
  className?: string;
  title?: string;
  cardsConfig?: OverviewCardConfig[];
  overviewData?: OverviewData;
};

export async function PaymentsOverview({
  timeFrame = "monthly",
  className,
  title = "IREB Approvals",
  cardsConfig = OVERVIEW_CARDS_CONFIG,
  overviewData: providedOverviewData,
}: PropsType) {
  const overviewData = providedOverviewData ?? (await getOverviewData());

  const xAxis = timeFrame === "yearly" ? [2020, 2021, 2022, 2023, 2024] : [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const series = cardsConfig.map(({ key, label }) => {
    const metric = overviewData[key];
    const base = metric.value;

    const lineData = xAxis.map((x) => ({
      x,
      y: Math.max(0, Math.round(base)),
    }));

    return {
      name: label,
      data: lineData,
    };
  });

  return (
    <div
      className={cn(
        "grid gap-2 rounded-[10px] bg-white px-7.5 pb-6 pt-7.5 shadow-1 dark:bg-gray-dark dark:shadow-card",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-body-2xlg font-bold text-dark dark:text-white">
          {title}
        </h2>

        <PeriodPicker defaultValue={timeFrame} sectionKey="payments_overview" />
      </div>

      <PaymentsOverviewChart data={series} />

      <dl className="grid divide-stroke text-center dark:divide-dark-3 sm:grid-cols-2 sm:divide-x [&>div]:flex [&>div]:flex-col-reverse [&>div]:gap-1">
        <div className="dark:border-dark-3 max-sm:mb-3 max-sm:border-b max-sm:pb-3">
          <dt className="text-xl font-bold text-dark dark:text-white">
            {standardFormat(overviewData.views.value)}
          </dt>
          <dd className="font-medium dark:text-dark-6">Current Total Requests</dd>
        </div>
        
      </dl>
 
    </div>
  );
}
