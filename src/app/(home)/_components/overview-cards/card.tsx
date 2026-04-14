import { cn } from "@/lib/utils";

type OverviewCardItem = {
  label: string;
  data: {
    value: number | string;
    growthRate: number;
  };
};

type PropsType = {
  items: OverviewCardItem[];
};

export function OverviewCard({ items }: PropsType) {
  return (
    <div className="col-span-12 rounded-[10px] bg-white py-5 shadow-1 dark:bg-gray-dark dark:shadow-card">
      <div className="flex flex-wrap justify-start px-5 gap-5 sm:grid-cols-2 xl:grid-cols-4 xl:gap-0">
        {items.map(({ label, data }) => {
          const isDecreasing = data.growthRate < 0;

          return (
            <div
              key={label}
              className="flex items-center justify-start px-5 gap-2 border-b border-stroke pb-5 last:border-b-0 last:pb-0 dark:border-dark-3 xl:border-b-0 xl:border-r xl:pb-0 last:xl:border-r-0"
            >
              <div className="py-2">
                <div className="flex items-center gap-4.5">
                  <h4 className="text-xl font-bold text-dark dark:text-white md:text-heading-5">
                    {data.value}
                  </h4>
                  <div
                    className={cn(
                      "flex items-center gap-1 text-body-sm font-medium",
                      isDecreasing ? "text-yellow-dark" : "text-green",
                    )}
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 10 10"
                      fill="currentColor"
                      aria-hidden
                    >
                      {isDecreasing ? (
                        <path d="M5.643 7.607L9.09 4.255l.909.884L5 10 0 5.139l.909-.884 3.448 3.353V0h1.286v7.607z" />
                      ) : (
                        <path d="M4.357 2.393L.91 5.745 0 4.861 5 0l5 4.861-.909.884-3.448-3.353V10H4.357V2.393z" />
                      )}
                    </svg>
                    <span>
                      {isDecreasing ? "-" : ""}
                      {Math.abs(data.growthRate)}%
                    </span>
                  </div>
                </div>
                <p className="-mt-1 text-body-sm font-medium">{label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
