import { compactFormat } from "@/lib/format-number";
import type { OverviewData } from "../../fetch";
import { OverviewCard } from "./card";
import { OVERVIEW_CARDS_CONFIG } from "./config";

export async function OverviewCardsGroup({
  overviewData,
}: {
  overviewData: OverviewData;
}) {
  const items = OVERVIEW_CARDS_CONFIG.map(({ key, label, prefix }) => {
    const metric = overviewData[key];

    return {
      label,
      data: {
        ...metric,
        value: `${prefix ?? ""}${compactFormat(metric.value)}`,
      },
    };
  });

  return (
    <div className="grid gap-4 sm:gap-6 2xl:gap-7.5">
      <OverviewCard items={items} />
    </div>
  );
}
