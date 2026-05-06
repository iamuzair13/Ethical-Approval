"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";

type PropsType = {
  data: Array<{
    name: string;
    data: { x: unknown; y: number }[];
  }>;
};

type BarChartProps = PropsType & {
  selectedIndex?: number;
  selectedLabel?: string;
};

const Chart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export function PaymentsOverviewChart({ data }: PropsType) {
  const isMobile = useIsMobile();

  const options: ApexOptions = {
    legend: {
      show: false,
    },
    colors: ["#5750F1", "#0ABEF9", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"],
    chart: {
      height: 310,
      type: "area",
      toolbar: {
        show: false,
      },
      fontFamily: "inherit",
    },
    fill: {
      gradient: {
        opacityFrom: 0.55,
        opacityTo: 0,
      },
    },
    responsive: [
      {
        breakpoint: 1024,
        options: {
          chart: {
            height: 300,
          },
        },
      },
      {
        breakpoint: 1366,
        options: {
          chart: {
            height: 320,
          },
        },
      },
    ],
    stroke: {
      curve: "smooth",
      width: isMobile ? 2 : 3,
    },
    grid: {
      strokeDashArray: 5,
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    tooltip: {
      marker: {
        show: true,
      },
    },
    xaxis: {
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
  };

  return (
    <div className="-ml-4 -mr-5 h-[310px]">
      <Chart
        options={options}
        series={data}
        type="area"
        height={310}
      />
    </div>
  );
}

export function PaymentsOverviewBarChartTable({
  data,
  selectedIndex,
  selectedLabel,
}: BarChartProps) {
  const first = data?.[0]?.data ?? [];
  const fallbackIndex = Math.max(0, first.length - 1);
  const activeIndex =
    typeof selectedIndex === "number"
      ? Math.min(Math.max(selectedIndex, 0), fallbackIndex)
      : fallbackIndex;
  const periodLabel =
    selectedLabel ??
    (typeof first[activeIndex]?.x === "string"
      ? first[activeIndex]?.x
      : typeof first[activeIndex]?.x === "number"
        ? String(first[activeIndex]?.x)
        : "Latest");

  const categories = data.map((s) => s.name);
  const values = data.map((s) => Number(s.data?.[activeIndex]?.y) || 0);

  const options: ApexOptions = {
    chart: {
      type: "bar",
      fontFamily: "inherit",
      toolbar: { show: false },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        barHeight: "60%",
      },
    },
    xaxis: {
      categories,
      labels: {
        formatter: (val) => String(Math.round(Number(val) || 0)),
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => String(Math.round(Number(val) || 0)),
      style: { fontSize: "12px" },
    },
    tooltip: {
      y: {
        formatter: (val) => String(Math.round(Number(val) || 0)),
      },
    },
    grid: {
      strokeDashArray: 5,
    },
    colors: ["#5750F1"],
    title: {
      text: periodLabel,
      align: "left",
      style: { fontSize: "12px", fontWeight: 600 },
    },
  };

  return (
    <Chart
      options={options}
      series={[
        {
          name: "Requests",
          data: values,
        },
      ]}
      type="bar"
      height={310}
    />
  );
}
