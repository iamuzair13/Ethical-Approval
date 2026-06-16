"use client";

import { useRouter } from "next/navigation";
import ApprovalRequestStepper from "@/app/profile/_components/approval-request-stepper";
import type { RequiredForm } from "@/app/profile/_components/forms/form-registry";

export const PREVIEW_APPLICANT_PROFILE = {
  name: "Preview Scholar",
  regNo: "000000000",
  email: "preview@uol.edu.pk",
  faculty: "Faculty of Engineering and Technology",
  department: "Preview Department",
  program: "Preview Program",
};

type EthicsFormPreviewProps = {
  requiredForm: RequiredForm;
};

export function EthicsFormPreview({ requiredForm }: EthicsFormPreviewProps) {
  const router = useRouter();

  return (
    <ApprovalRequestStepper
      open
      layout="page"
      mode="preview"
      requiredForm={requiredForm}
      applicantProfile={PREVIEW_APPLICANT_PROFILE}
      userStorageId="admin-preview"
      onClose={() => router.push("/forms")}
      onSubmit={async () => ({ ok: false })}
    />
  );
}
