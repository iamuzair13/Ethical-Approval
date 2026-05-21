"use client";

import { colorsForUsedDeviceStatuses } from "@/components/Charts/used-devices/status-colors";
import { compactFormat } from "@/lib/format-number";
import type { ApexOptions } from "apexcharts";
import dynamic from "next/dynamic";

type PropsType = {
  data: { name: string; amount: number; percentage?: number }[];
};

type BarChartTableProps = PropsType & {
  selectedLabel?: string;
};

const Chart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

export function DonutChart({ data }: PropsType) {
  const statusColors = colorsForUsedDeviceStatuses(data.map((item) => item.name));

  const chartOptions: ApexOptions = {
    chart: {
      type: "donut",
      fontFamily: "inherit",
    },
    colors: statusColors,
    labels: data.map((item) => item.name),
    legend: {
      show: true,
      position: "bottom",
      itemMargin: {
        horizontal: 10,
        vertical: 5,
      },
      formatter: (legendName, opts) => {
        const item = data[opts.seriesIndex];
        if (typeof item?.percentage === "number") {
          return `${legendName}: ${item.percentage}%`;
        }

        const { seriesPercent } = opts.w.globals;
        return `${legendName}: ${seriesPercent[opts.seriesIndex]}%`;
      },
    },
    plotOptions: {
      pie: {
        donut: {
          size: "80%",
          background: "transparent",
          labels: {
            show: true,
            total: {
              show: true,
              showAlways: true,
              label: "Total Requests",
              fontSize: "16px",
              fontWeight: "400",
            },
            value: {
              show: true,
              fontSize: "28px",
              fontWeight: "bold",
              formatter: (val) => compactFormat(+val),
            },
          },
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    responsive: [
      {
        breakpoint: 2600,
        options: {
          chart: {
            width: 415,
          },
        },
      },
      {
        breakpoint: 640,
        options: {
          chart: {
            width: "100%",
          },
        },
      },
      {
        breakpoint: 370,
        options: {
          chart: {
            width: 260,
          },
        },
      },
    ],
  };

  return (
    <Chart
      options={chartOptions}
      series={data.map((item) => item.amount)}
      type="donut"
    />
  );
}

export function BarChartTable({ data, selectedLabel }: BarChartTableProps) {
  const statusColors = colorsForUsedDeviceStatuses(data.map((item) => item.name));

  const options: ApexOptions = {
    chart: {
      type: "bar",
      fontFamily: "inherit",
      toolbar: { show: false },
    },
    colors: statusColors,
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        barHeight: "60%",
        distributed: true,
      },
    },
    xaxis: {
      categories: data.map((item) => item.name),
      labels: {
        formatter: (val) => compactFormat(Number(val)),
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => compactFormat(Number(val)),
      style: { fontSize: "12px" },
    },
    tooltip: {
      y: {
        formatter: (val) => compactFormat(Number(val)),
      },
    },
    grid: {
      strokeDashArray: 5,
    },
    legend: { show: false },
    title: selectedLabel
      ? {
          text: selectedLabel,
          align: "left",
          style: { fontSize: "12px", fontWeight: 600 },
        }
      : undefined,
  };

  return (
    <Chart
      options={options}
      series={[
        {
          name: "Requests",
          data: data.map((item) => item.amount),
        },
      ]}
      type="bar"
      height={260}
    />
  );
}
