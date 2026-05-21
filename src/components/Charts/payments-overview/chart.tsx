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

  const categories =
    data[0]?.data.map((point) =>
      typeof point.x === "string" ? point.x : String(point.x),
    ) ?? [];

  const barSeries = data.map((series) => ({
    name: series.name,
    data: series.data.map((point) => Math.max(0, Math.round(point.y))),
  }));

  const options: ApexOptions = {
    legend: {
      show: true,
      position: "bottom",
      horizontalAlign: "center",
      fontSize: isMobile ? "11px" : "12px",
      markers: {
        size: 6,
      },
    },
    colors: ["#5750F1", "#fca708", "#f7c060", "#2aa33f", "#39f029", "#ff0703", "#bf1c19"],
    chart: {
      height: 310,
      type: "bar",
      toolbar: {
        show: false,
      },
      fontFamily: "inherit",
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: isMobile ? "80%" : "65%",
        borderRadius: 4,
        borderRadiusApplication: "end",
        dataLabels: {
          position: "top",
        },
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
    grid: {
      strokeDashArray: 5,
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    dataLabels: {
      enabled: true,
      offsetY: -2,
      formatter: (val) => {
        const n = Math.round(Number(val) || 0);
        return n > 0 ? String(n) : "";
      },
      style: {
        fontSize: isMobile ? "9px" : "11px",
        fontWeight: 600,
      },
      background: {
        enabled: false,
      },
    },
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter: (val) => String(Math.round(Number(val) || 0)),
      },
    },
    xaxis: {
      categories,
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      labels: {
        rotate: isMobile ? -45 : 0,
        style: {
          fontSize: isMobile ? "10px" : "12px",
        },
      },
    },
    yaxis: {
      labels: {
        formatter: (val) => String(Math.round(Number(val) || 0)),
      },
    },
  };

  return (
    <div className="-ml-4 -mr-5 h-[310px]">
      <Chart
        options={options}
        series={barSeries}
        type="bar"
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
