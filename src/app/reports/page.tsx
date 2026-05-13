import { authOptions } from "@/lib/auth-options";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ReportsCatalog } from "./_components/reports-catalog";

export const metadata = { title: "Reports" };

export default async function ReportsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.adminId || !session.user.adminRole) {
    redirect("/auth/sign-in?callbackUrl=/reports");
  }

  return (
    <>
      <Breadcrumb pageName="Reports" />
      <ReportsCatalog adminRole={session.user.adminRole} />
    </>
  );
}
