import { PeriodPicker } from "@/components/period-picker";
import { cn } from "@/lib/utils";
import { getDevicesUsedData } from "@/services/charts.services";
import { UsedDevicesViewToggle } from "./view-toggle";

export type UsedDeviceDatum = {
  name: string;
  amount: number;
  percentage?: number;
};

type PropsType = {
  timeFrame?: string;
  className?: string;
  title?: string;
  sectionKey?: string;
  data?: UsedDeviceDatum[];
};

export async function UsedDevices({
  timeFrame = "monthly",
  className,
  title = "IREB Approvals",
  sectionKey = "used_devices",
  data,
}: PropsType) {
  const chartData = data ?? (await getDevicesUsedData(timeFrame));
  const currentDate = new Date();
  const periodOptions =
    timeFrame === "yearly"
      ? Array.from({ length: 6 }, (_, index) => String(currentDate.getFullYear() - index))
      : Array.from({ length: 12 }, (_, index) => {
          const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - index, 1);
          return new Intl.DateTimeFormat("en-US", {
            month: "short",
            year: "numeric",
          }).format(date);
        });

  return (
    <div
      className={cn(
        "grid grid-cols-1 grid-rows-[auto_1fr] gap-9 rounded-[10px] bg-white p-7.5 shadow-1 dark:bg-gray-dark dark:shadow-card",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-body-2xlg font-bold text-dark dark:text-white">
          {title}
        </h2>

        <div className="flex items-center gap-3">
          <PeriodPicker defaultValue={timeFrame} sectionKey={sectionKey} minimal />
        </div>
      </div>

      <div className="grid place-items-center">
        <UsedDevicesViewToggle data={chartData} periodOptions={periodOptions} />
      </div>


    </div>
  );
}
