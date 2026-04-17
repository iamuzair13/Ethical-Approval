import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { authOptions } from "@/lib/auth-options";
import { normalizeFacultyIds, type AuthenticatedAdmin } from "@/lib/admin-auth";
import { canAccessFacultySnapshot } from "@/lib/authorization";
import { getSubmissionDetailById } from "@/lib/submission-details";
import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";

function formatLabel(value: string) {
  return value
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value.trim() || "—";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((item) => formatValue(item)).join(", ") || "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function renderBlock(data: Record<string, unknown>) {
  const entries = Object.entries(data).filter(([, value]) => {
    if (value == null) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") return Object.keys(value).length > 0;
    return true;
  });

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-lg border border-stroke p-3 dark:border-dark-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-body">
            {formatLabel(key)}
          </p>
          <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm text-dark dark:text-white">
            {formatValue(value)}
          </pre>
        </div>
      ))}
    </div>
  );
}

export default async function AdminSubmissionProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/auth/sign-in");
  }

  if (
    !session.user.adminId ||
    !session.user.adminRole ||
    !session.user.adminStatus ||
    session.user.adminStatus !== "active"
  ) {
    redirect("/admin/login");
  }
  const actor: AuthenticatedAdmin = {
    adminId: session.user.adminId,
    role: session.user.adminRole,
    status: session.user.adminStatus,
    scopeMode: session.user.adminScopeMode ?? "all",
    facultyIds: normalizeFacultyIds(session.user.adminFacultyIds),
    tokenVersion: 0,
  };

  const { id } = await params;
  const submissionId = Number(id);
  if (!Number.isInteger(submissionId)) notFound();

  const submission = await getSubmissionDetailById(submissionId);
  if (!submission) notFound();

  if (!(await canAccessFacultySnapshot(actor, submission.applicant_faculty))) {
    redirect("/");
  }

  const ethics =
    submission.ethics_json && typeof submission.ethics_json === "object"
      ? (submission.ethics_json as Record<string, unknown>)
      : null;
  const formData =
    ethics?.form && typeof ethics.form === "object"
      ? (ethics.form as Record<string, unknown>)
      : null;
  const attachmentFiles =
    ethics?.attachmentFiles &&
    typeof ethics.attachmentFiles === "object" &&
    !Array.isArray(ethics.attachmentFiles)
      ? (ethics.attachmentFiles as Record<string, unknown>)
      : null;
  const extraUploads = Array.isArray(ethics?.extraUploadFiles)
    ? (ethics.extraUploadFiles as unknown[])
    : [];

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <Breadcrumb pageName="Student Application View" />

      <div className="grid gap-6">
        <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <h2 className="text-heading-6 font-bold text-dark dark:text-white">
            {submission.applicant_name}
          </h2>
          <p className="mt-1 text-body-sm">{submission.applicant_email}</p>
          <p className="mt-1 text-body-sm">
            Faculty: {submission.applicant_faculty} · Department: {submission.applicant_department}
          </p>
          <p className="mt-1 text-body-sm">
            Program: {submission.applicant_program || "—"} · SAP ID: {submission.applicant_sap_id}
          </p>
        </div>

        <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <h3 className="mb-4 text-heading-6 font-bold text-dark dark:text-white">
            Research Core
          </h3>
          {renderBlock({
            title: submission.title,
            objectives: submission.objectives,
            methodology: submission.methodology,
            participantsRange: submission.participants_range,
            researchPopulation: submission.research_population,
            type: submission.type,
            domain: submission.domain,
            submittedAt: new Date(submission.submitted_at).toLocaleString(),
            currentStatus: submission.current_status,
          })}
        </div>

        {!!ethics?.requiredForm && typeof ethics.requiredForm === "object" && (
          <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
            <h3 className="mb-4 text-heading-6 font-bold text-dark dark:text-white">
              Required Form
            </h3>
            {renderBlock(ethics.requiredForm as Record<string, unknown>)}
          </div>
        )}

        {attachmentFiles && (
          <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
            <h3 className="mb-4 text-heading-6 font-bold text-dark dark:text-white">
              Uploaded Attachments
            </h3>
            {renderBlock(attachmentFiles)}
          </div>
        )}

        {extraUploads.length > 0 && (
          <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
            <h3 className="mb-4 text-heading-6 font-bold text-dark dark:text-white">
              Additional Documents
            </h3>
            {renderBlock({ uploads: extraUploads })}
          </div>
        )}

        {formData && (
          <div className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
            <h3 className="mb-4 text-heading-6 font-bold text-dark dark:text-white">
              Complete Submitted Application
            </h3>
            {renderBlock(formData)}
          </div>
        )}
      </div>
    </div>
  );
}
