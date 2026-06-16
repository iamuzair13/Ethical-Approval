import Link from "next/link";
import { authOptions } from "@/lib/auth-options";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import {
  ADMIN_ETHICS_FORM_CATALOG,
} from "@/app/profile/_components/forms/form-registry";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export const metadata = { title: "Forms" };

export default async function FormsCatalogPage() {
  const session = await getServerSession(authOptions);
  if (session?.user?.adminRole !== "administrator") {
    redirect("/auth/sign-in?callbackUrl=/forms");
  }

  return (
    <>
      <Breadcrumb pageName="Ethical Application Forms" />
      <div className="rounded-xl border border-stroke bg-white p-6 dark:border-dark-3 dark:bg-gray-dark ">
        <p className="mb-6 text-sm text-body dark:text-dark-6 ">
          Preview all ethical application forms with the same UI students use. No validation or
          saving — for administrator reference only.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 ">
          {ADMIN_ETHICS_FORM_CATALOG.map((form) => (
            <Link
              key={form.id}
              href={`/forms/${form.id}`}
              className="group flex flex-col gap-2  rounded-lg border border-stroke p-5 transition hover:border-primary hover:bg-primary/5 dark:border-dark-3 dark:hover:border-primary/50 dark:hover:bg-primary/10"
            >
              <span className="text-base font-semibold text-dark group-hover:text-primary dark:text-white">
                {form.navTitle}
              </span>
              <span className="text-xs uppercase tracking-wide text-body dark:text-dark-6">
                {form.applicationType === "thesis" ? "Thesis" : "Research publication"}
              </span>
              <span className="line-clamp-2 text-xs text-body dark:text-dark-6">{form.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
