import { authOptions } from "@/lib/auth-options";
import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { getAdminFormById } from "@/app/profile/_components/forms/form-registry";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { EthicsFormPreview } from "../_components/ethics-form-preview";

type FormPreviewPageProps = {
  params: Promise<{ formId: string }>;
};

export async function generateMetadata({ params }: FormPreviewPageProps) {
  const { formId } = await params;
  const form = getAdminFormById(formId);
  return { title: form?.label ?? "Form Preview" };
}

export default async function FormPreviewPage({ params }: FormPreviewPageProps) {
  const session = await getServerSession(authOptions);
  if (session?.user?.adminRole !== "administrator") {
    redirect("/auth/sign-in?callbackUrl=/forms");
  }

  const { formId } = await params;
  const requiredForm = getAdminFormById(formId);
  if (!requiredForm) {
    notFound();
  }

  return (
    <>
      <Breadcrumb pageName={requiredForm.label} />
      <EthicsFormPreview requiredForm={requiredForm} />
    </>
  );
}
