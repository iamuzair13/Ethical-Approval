import Breadcrumb from "@/components/Breadcrumbs/Breadcrumb";
import { formatSubmissionApplicationType } from "@/app/(home)/fetch";
import { ViewDocumentsButton } from "@/app/admin/submissions/[id]/profile/_components/view-documents-button";
import { authOptions } from "@/lib/auth-options";
import { normalizeFacultyIds, type AuthenticatedAdmin } from "@/lib/admin-auth";
import { canAccessFacultySnapshot } from "@/lib/authorization";
import { listSubmissionDocuments } from "@/lib/list-submission-documents";
import { getSubmissionDetailById } from "@/lib/submission-details";
import { cn } from "@/lib/utils";
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

function formatSubmissionStatus(
  status:
    | "submitted"
    | "under_dean_review"
    | "dean_approved"
    | "dean_rejected"
    | "under_ireb_review"
    | "approved"
    | "rejected",
): string {
  switch (status) {
    case "submitted":
    case "under_dean_review":
      return "Under Review by Dean";
    case "dean_approved":
    case "under_ireb_review":
      return "Under Review by IREB";
    case "dean_rejected":
      return "Rejected by Dean";
    case "approved":
      return "Approved by IREB";
    case "rejected":
      return "Rejected by IREB";
    default:
      return status;
  }
}

function statusBadgeClass(status: ReturnType<typeof formatSubmissionStatus>): string {
  if (status.includes("Approved")) return "bg-[#10B981]/[0.08] text-green";
  if (status.includes("Rejected")) return "bg-[#FB5454]/[0.08] text-red";
  return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200";
}

function formatDomain(domain: "medical" | "non_medical"): string {
  return domain === "medical" ? "Medical" : "Non-medical";
}

function formStr(form: Record<string, unknown> | null, key: string): string {
  if (!form) return "";
  const v = form[key];
  return typeof v === "string" ? v.trim() : "";
}

function renderDetailGrid(data: Record<string, unknown>) {
  const entries = Object.entries(data).filter(([, value]) => {
    if (value == null) return false;
    if (typeof value === "string") return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === "object") return Object.keys(value).length > 0;
    return true;
  });

  if (entries.length === 0) {
    return <p className="text-sm text-body">No additional details recorded.</p>;
  }

  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-lg border border-stroke p-4 dark:border-dark-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-body">
            {formatLabel(key)}
          </dt>
          <dd className="mt-2 whitespace-pre-wrap break-words text-sm text-dark dark:text-white">
            {formatValue(value)}
          </dd>
        </div>
      ))}
    </dl>
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

  const applicationType = formatSubmissionApplicationType(submission.type);
  const researchTitle =
    submission.title?.trim() || formStr(formData, "thesisTitle") || "—";
  const statusLabel = formatSubmissionStatus(submission.current_status);
  const documents = listSubmissionDocuments(submissionId, ethics);

  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <Breadcrumb pageName="Application profile" />

      <div className="grid gap-6">
        {/* Priority summary */}
        <section className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-heading-5 font-bold text-dark dark:text-white">
                  {submission.applicant_name}
                </h1>
                <span
                  className={cn(
                    "inline-block rounded px-2.5 py-1 text-xs font-semibold capitalize",
                    statusBadgeClass(statusLabel),
                  )}
                >
                  {statusLabel}
                </span>
              </div>

              <p className="mt-2 font-mono text-sm font-semibold text-primary">
                Application ID: {submission.application_id}
              </p>

              <dl className="mt-5 grid gap-4 border-t border-stroke pt-5 dark:border-dark-3 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-body">
                    Application type
                  </dt>
                  <dd className="mt-1 text-base font-medium text-dark dark:text-white">
                    {applicationType}
                    <span className="ml-2 text-sm font-normal text-body">
                      ({formatDomain(submission.domain)})
                    </span>
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-body">
                    Title
                  </dt>
                  <dd className="mt-1 text-base font-medium leading-snug text-dark dark:text-white">
                    {researchTitle}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
              <ViewDocumentsButton
                applicationId={submission.application_id}
                documents={documents}
              />
              {submission.submission_attachment_count > 0 ? (
                <p className="text-center text-xs text-body sm:text-right">
                  {submission.submission_attachment_count} file
                  {submission.submission_attachment_count === 1 ? "" : "s"} on record
                </p>
              ) : null}
            </div>
          </div>

          <dl className="mt-6 grid gap-3 border-t border-stroke pt-5 text-sm dark:border-dark-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-body">Email</dt>
              <dd className="mt-1 break-all text-dark dark:text-white">
                <a className="hover:underline" href={`mailto:${submission.applicant_email}`}>
                  {submission.applicant_email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-body">Faculty</dt>
              <dd className="mt-1 text-dark dark:text-white">{submission.applicant_faculty}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-body">
                Department
              </dt>
              <dd className="mt-1 text-dark dark:text-white">{submission.applicant_department}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-body">Program</dt>
              <dd className="mt-1 text-dark dark:text-white">
                {submission.applicant_program || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-body">SAP ID</dt>
              <dd className="mt-1 font-mono text-dark dark:text-white">
                {submission.applicant_sap_id}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-body">Submitted</dt>
              <dd className="mt-1 text-dark dark:text-white">
                {new Date(submission.submitted_at).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-body">
                Submission attempt
              </dt>
              <dd className="mt-1 text-dark dark:text-white">
                {submission.applicant_attempt_number} of {submission.applicant_total_submissions}
              </dd>
            </div>
          </dl>
        </section>

        {/* Research summary */}
        <section className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
          <h2 className="mb-4 text-heading-6 font-bold text-dark dark:text-white">
            Research summary
          </h2>
          {renderDetailGrid({
            objectives: submission.objectives,
            methodology: submission.methodology,
            participantsRange: submission.participants_range,
            researchPopulation: submission.research_population,
            timelineStart: submission.start_date
              ? new Date(submission.start_date).toLocaleDateString()
              : null,
            timelineEnd: submission.end_date
              ? new Date(submission.end_date).toLocaleDateString()
              : null,
          })}
        </section>

        {!!ethics?.requiredForm && typeof ethics.requiredForm === "object" && (
          <section className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
            <h2 className="mb-4 text-heading-6 font-bold text-dark dark:text-white">
              Required form
            </h2>
            {renderDetailGrid(ethics.requiredForm as Record<string, unknown>)}
          </section>
        )}

        

        {extraUploads.length > 0 && (
          <section className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
            <h2 className="mb-4 text-heading-6 font-bold text-dark dark:text-white">
              Additional documents (metadata)
            </h2>
            {renderDetailGrid({ uploads: extraUploads })}
          </section>
        )}

        {formData && (
          <section className="rounded-[10px] bg-white p-6 shadow-1 dark:bg-gray-dark dark:shadow-card">
            <h2 className="mb-4 text-heading-6 font-bold text-dark dark:text-white">
              Complete submitted application
            </h2>
            {renderDetailGrid(formData)}
          </section>
        )}
      </div>
    </div>
  );
}
