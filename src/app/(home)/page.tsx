import { PaymentsOverview } from "@/components/Charts/payments-overview";
import { UsedDevices } from "@/components/Charts/used-devices";
import { LeadsReport } from "@/components/Tables/leads-report";
import { getServerSession } from "next-auth";
import { createTimeFrameExtractor } from "@/utils/timeframe-extractor";
import { authOptions } from "@/lib/auth-options";
import { OverviewCardsGroup } from "./_components/overview-cards";
import { getDashboardLeads, getOverviewData, getUsedDevicesData } from "./fetch";
import DashboardApiProbe from "@/components/debug/dashboard-api-probe";

type PropsType = {
  searchParams: Promise<{
    selected_time_frame?: string;
  }>;
};

export default async function Home({ searchParams }: PropsType) {
  const { selected_time_frame } = await searchParams;
  const extractTimeFrame = createTimeFrameExtractor(selected_time_frame);
  const session = await getServerSession(authOptions);
  if (!session) {
    return null;
  }

  const [overviewData, usedDevicesData, leadsData] = await Promise.all([
    getOverviewData(session),
    getUsedDevicesData(session),
    getDashboardLeads(session),
  ]);
  const usedDevicesTitle =
    session.user.adminRole === "dean"
      ? "Dean Request Breakdown"
      : session.user.adminRole === "ireb"
        ? "IREB Request Breakdown"
        : "Request Status Breakdown";

  return (
    <>
      <DashboardApiProbe tag="home" />
      <OverviewCardsGroup overviewData={overviewData} />

      <div className="mt-4 grid grid-cols-12 gap-4 md:mt-6 md:gap-6 2xl:mt-9 2xl:gap-7.5">
        <PaymentsOverview
          className="col-span-12 xl:col-span-7"
          key={extractTimeFrame("payments_overview")}
          timeFrame={extractTimeFrame("payments_overview")?.split(":")[1]}
          overviewData={overviewData}
        />

        <UsedDevices
          className="col-span-12 xl:col-span-5"
          key={extractTimeFrame("used_devices")}
          timeFrame={extractTimeFrame("used_devices")?.split(":")[1]}
          title={usedDevicesTitle}
          data={usedDevicesData}
        />

        <LeadsReport leads={leadsData} currentRole={session.user.adminRole ?? null} />
      </div>
    </>
  );
}
