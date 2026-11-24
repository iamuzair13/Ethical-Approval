import { formatSubmissionApplicationType } from "@/app/(home)/fetch";
import { ViewDocumentsButton } from "@/app/admin/submissions/[id]/profile/_components/view-documents-button";
import { authOptions } from "@/lib/auth-options";
import { normalizeFacultyIds, type AuthenticatedAdmin } from "@/lib/admin-auth";
import { canAccessFacultySnapshot } from "@/lib/authorization";
import { listSubmissionDocuments } from "@/lib/list-submission-documents";
import {
  getSubmissionDetailById,
  getApprovalDecisionsBySubmissionId,
  type ApprovalDecisionRow,
} from "@/lib/submission-details";
import { FieldRows } from "@/app/admin/submissions/[id]/profile/_components/field-rows";
import {
  getFormSteps,
  isEmptyValue,
  isHodKey,
  isIdentityKey,
  isInternalIdKey,
  isSpecialKey,
} from "@/lib/submission-form-steps";
import { cn } from "@/lib/utils";
import { getServerSession } from "next-auth";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

// ─── Status / stage labels ───

type SubmissionStatus =
  | "submitted"
  | "under_hod_review"
  | "hod_approved"
  | "hod_rejected"
  | "under_admin_review"
  | "under_ireb_review"
  | "approved"
  | "rejected";

function formatSubmissionStatus(
  status: SubmissionStatus,
  hodName?: string | null,
  decidingStage?: string | null,
): string {
  switch (status) {
    case "submitted":
    case "under_hod_review":
      return hodName ? `Under review — ${hodName}` : "HOD not assigned";
    case "hod_approved":
    case "under_admin_review":
    case "under_ireb_review":
      return "Under review — IREB";
    case "hod_rejected":
      return "Rejected by HOD";
    case "approved":
      return decidingStage === "admin" ? "Approved by administrator" : "Approved by IREB";
    case "rejected":
      return decidingStage === "admin" ? "Rejected by administrator" : "Rejected by IREB";
    default:
      return status;
  }
}

function statusTone(status: string): "success" | "danger" | "pending" {
  if (status.toLowerCase().includes("approved")) return "success";
  if (status.toLowerCase().includes("rejected")) return "danger";
  return "pending";
}

function decisionStageLabel(stage: string): string {
  if (stage === "hod") return "HOD";
  if (stage === "admin") return "Administrator";
  return "IREB";
}

function decisionLabel(decision: string): string {
  if (decision === "recommended") return "Forwarded to IREB";
  if (decision === "marked_sensitive") return "Marked as sensitive";
  return decision;
}

// ─── Verdict stamp ───

function VerdictStamp({ label, tone }: { label: string; tone: "success" | "danger" | "pending" }) {
  const cls =
    tone === "success"
      ? "border-emerald-600 text-emerald-700 dark:border-emerald-500 dark:text-emerald-400"
      : tone === "danger"
        ? "border-red-600 text-red-700 dark:border-red-500 dark:text-red-400"
        : "border-amber-600 text-amber-700 dark:border-amber-500 dark:text-amber-400";
  return (
    <div
      className={cn(
        "shrink-0 rotate-[-1.5deg] rounded border-2 px-4 py-2 text-center text-xs font-bold uppercase tracking-[0.18em]",
        "outline outline-1 outline-offset-2",
        cls,
      )}
    >
      {label}
    </div>
  );
}

// ─── Small presentational helpers ───

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <dt className="text-xs font-semibold text-body">{children}</dt>;
}

function MetaItem({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <dd className={cn("mt-0.5 truncate text-sm font-medium text-dark dark:text-white", mono && "font-mono")}>
        {children}
      </dd>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="border-b border-stroke px-6 py-3 text-sm font-semibold text-dark dark:border-dark-3 dark:text-white">
      {children}
    </h2>
  );
}

export default async function AdminSubmissionProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/auth/sign-in");

  if (
    !session.user.adminId ||
    !session.user.adminRole ||
    session.user.adminStatus !== "active"
  ) {
    redirect("/auth/sign-in");
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

  const requiredForm =
    ethics?.requiredForm && typeof ethics.requiredForm === "object"
      ? (ethics.requiredForm as { id?: string; label?: string })
      : null;
  const formId = requiredForm?.id ?? null;

  const steps = getFormSteps(formId);

  // Fields covered by the curated step map — everything else lands in a
  // trailing "Additional responses" section so nothing is ever hidden.
  const coveredKeys = new Set<string>();
  if (steps) for (const s of steps) for (const k of s.keys) coveredKeys.add(k);

  const isSkippedKey = (k: string) =>
    isIdentityKey(k) || isHodKey(k) || isSpecialKey(k) || isInternalIdKey(k);

  const leftoverEntries = formData
    ? Object.entries(formData).filter(
        ([k, v]) => !coveredKeys.has(k) && !isSkippedKey(k) && !isEmptyValue(v),
      )
    : [];

  const applicationType = formatSubmissionApplicationType(submission.type);
  const researchTitle =
    submission.title?.trim() ||
    (formData && typeof formData.thesisTitle === "string" ? formData.thesisTitle.trim() : "") ||
    (formData && typeof formData.publicationTitle === "string" ? formData.publicationTitle.trim() : "") ||
    "—";

  const hodName = submission.hod_name_snapshot ?? null;
  const decisions = await getApprovalDecisionsBySubmissionId(submissionId);
  const finalDecidingStage =
    submission.current_status === "approved" || submission.current_status === "rejected"
      ? decisions.filter((d) => d.decision === "approved" || d.decision === "rejected").at(0)
          ?.stage ?? null
      : null;
  const statusLabel = formatSubmissionStatus(
    submission.current_status,
    hodName,
    finalDecidingStage,
  );
  const documents = listSubmissionDocuments(submissionId, ethics);

  const isAcceptedValue = (v: unknown) =>
    typeof v === "string" && ["yes", "true", "on", "accepted"].includes(v.trim().toLowerCase());
  const hasDeclaration =
    isAcceptedValue(formData?.declarationAccepted) ||
    isAcceptedValue(formData?.form3DeclarationAccepted) ||
    isAcceptedValue(formData?.publicationDeclarationAccepted);

  const formName = requiredForm?.label?.replace(/\.docx$/i, "");

  return (
    <div className="mx-auto w-full max-w-[1280px]">
      <Link
        href="/"
        className="mb-5 inline-flex items-center gap-1.5 text-sm font-medium text-body transition hover:text-primary"
      >
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        All applications
      </Link>

      {/* ─── Dossier head: docket number, title, verdict stamp ─── */}
      <header className="border-b-2 border-dark pb-6 dark:border-white">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <p className="font-mono text-sm font-semibold tracking-tight text-primary">
            {submission.application_id}
          </p>
          <p className="text-sm text-body">
            {applicationType}
            {formName ? ` · ${formName}` : ""}
          </p>
        </div>

        <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 max-w-3xl">
            <h1 className="text-2xl font-bold leading-tight tracking-tight text-dark dark:text-white sm:text-3xl">
              {researchTitle}
            </h1>
            <p className="mt-3 text-sm text-body">
              Submitted by{" "}
              <span className="font-semibold text-dark dark:text-white">{submission.applicant_name}</span>
              {" "}({submission.applicant_sap_id}) ·{" "}
              {submission.domain === "medical" ? "Medical" : "Non-medical"} ·{" "}
              {new Date(submission.submitted_at).toLocaleString()} ·{" "}
              Attempt {submission.applicant_attempt_number} of {submission.applicant_total_submissions}
              {submission.is_sensitive && (
                <span className="ml-2 inline-flex items-center rounded border border-red-300 bg-red-50 px-1.5 py-0.5 align-middle text-[11px] font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                  Sensitive
                </span>
              )}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-4 sm:items-end">
            <VerdictStamp label={statusLabel} tone={statusTone(statusLabel)} />
            <ViewDocumentsButton
              applicationId={submission.application_id}
              documents={documents}
            />
          </div>
        </div>
      </header>

      <div className="mt-8 grid gap-8 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* ─── Left rail: people + review record ─── */}
        <aside className="flex flex-col gap-8 self-start lg:sticky lg:top-6">
          <section className="overflow-hidden rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark">
            <SectionHeading>Applicant</SectionHeading>
            <dl className="grid gap-4 px-6 py-5">
              <MetaItem label="Name">{submission.applicant_name}</MetaItem>
              <MetaItem label="SAP ID" mono>{submission.applicant_sap_id}</MetaItem>
              <MetaItem label="Email">
                <a className="hover:underline" href={`mailto:${submission.applicant_email}`}>
                  {submission.applicant_email}
                </a>
              </MetaItem>
              <MetaItem label="Faculty">{submission.applicant_faculty || "—"}</MetaItem>
              <MetaItem label="Department">{submission.applicant_department || "—"}</MetaItem>
              <MetaItem label="Program">{submission.applicant_program || "—"}</MetaItem>
            </dl>
          </section>

          {hodName && (
            <section className="overflow-hidden rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark">
              <SectionHeading>Reviewing HOD</SectionHeading>
              <dl className="grid gap-4 px-6 py-5">
                <MetaItem label="Name">{hodName}</MetaItem>
                {submission.hod_sap_id_snapshot && (
                  <MetaItem label="SAP ID" mono>{submission.hod_sap_id_snapshot}</MetaItem>
                )}
                {submission.hod_email_snapshot && (
                  <MetaItem label="Email">
                    <a className="hover:underline" href={`mailto:${submission.hod_email_snapshot}`}>
                      {submission.hod_email_snapshot}
                    </a>
                  </MetaItem>
                )}
                {submission.hod_department_snapshot && (
                  <MetaItem label="Department">{submission.hod_department_snapshot}</MetaItem>
                )}
                {submission.hod_faculty_snapshot && (
                  <MetaItem label="Faculty">{submission.hod_faculty_snapshot}</MetaItem>
                )}
              </dl>
            </section>
          )}

          <section className="overflow-hidden rounded-lg border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark">
            <SectionHeading>Review record</SectionHeading>
            <ol>
              <RecordRow
                tone="neutral"
                action="Submitted"
                actor={submission.applicant_name}
                at={submission.submitted_at}
                last={!submission.assigned_ireb_name && decisions.length === 0}
              />
              {submission.assigned_ireb_name && (
                <RecordRow
                  tone="info"
                  action="Recommended to IREB"
                  actor={submission.assigned_ireb_name}
                  last={decisions.length === 0}
                />
              )}
              {[...decisions].reverse().map((d: ApprovalDecisionRow, i, arr) => (
                <RecordRow
                  key={d.id}
                  tone={d.decision === "approved" ? "success" : d.decision === "rejected" ? "danger" : "info"}
                  action={`${decisionStageLabel(d.stage as string)} — ${decisionLabel(d.decision)}`}
                  actor={d.decided_by_name}
                  at={d.decided_at}
                  comment={d.comment}
                  last={
                    i === arr.length - 1 &&
                    submission.current_status !== "approved" &&
                    submission.current_status !== "rejected"
                  }
                />
              ))}
              {(submission.current_status === "approved" || submission.current_status === "rejected") && (
                <RecordRow
                  tone={submission.current_status === "approved" ? "success" : "danger"}
                  action={submission.current_status === "approved" ? "Final — approved" : "Final — rejected"}
                  last
                />
              )}
            </ol>
          </section>
        </aside>

        {/* ─── Main column: application content as steps ─── */}
        <main className="flex min-w-0 flex-col gap-6">
          {steps ? (
            steps.map((step, index) => {
              const isAttachments = step.keys.includes("requiredAttachments");
              const isDeclaration = step.keys.some(
                (k) => k === "declarationAccepted" || k === "form3DeclarationAccepted" || k === "publicationDeclarationAccepted",
              );

              const pairs: [string, unknown][] = formData
                ? step.keys.map((k) => [k, formData[k]] as [string, unknown])
                : [];

              if (isAttachments) {
                return (
                  <StepSection key={step.title} index={index + 1} title={step.title} anchor={`step-${index + 1}`}>
                    {documents.length > 0 ? (
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {documents.map((doc) => (
                          <li
                            key={doc.id}
                            className="flex items-center gap-2.5 rounded-md border border-stroke px-3 py-2.5 dark:border-dark-3"
                          >
                            <svg className="size-4 shrink-0 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeLinecap="round" />
                              <path d="M14 2v6h6" strokeLinecap="round" />
                            </svg>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-dark dark:text-white">{doc.label}</p>
                              <p className="truncate font-mono text-xs text-body">{doc.fileName}</p>
                            </div>
                            {!doc.hasStoredFile && (
                              <span className="ml-auto shrink-0 text-xs text-amber-700 dark:text-amber-300">name only</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-body">No attachments recorded.</p>
                    )}
                    {documents.length > 0 && (
                      <p className="mt-3 text-xs text-body">
                        Open files via the <span className="font-semibold">View documents</span> button above.
                      </p>
                    )}
                  </StepSection>
                );
              }

              if (isDeclaration) {
                return (
                  <StepSection key={step.title} index={index + 1} title={step.title} anchor={`step-${index + 1}`}>
                    <p className="flex items-center gap-2 text-sm">
                      <span
                        className={cn(
                          "inline-block size-2 rounded-full",
                          hasDeclaration ? "bg-emerald-500" : "bg-amber-500",
                        )}
                        aria-hidden
                      />
                      <span className="font-medium text-dark dark:text-white">
                        {hasDeclaration ? "Declaration accepted" : "Declaration status not recorded"}
                      </span>
                    </p>
                  </StepSection>
                );
              }

              return (
                <StepSection key={step.title} index={index + 1} title={step.title} anchor={`step-${index + 1}`}>
                  <FieldRows pairs={pairs} />
                </StepSection>
              );
            })
          ) : formData ? (
            <StepSection index={1} title="Application responses" anchor="step-1">
              <FieldRows
                pairs={Object.entries(formData).filter(([k]) => !isSkippedKey(k))}
              />
            </StepSection>
          ) : (
            <p className="text-sm text-body">No application form data recorded.</p>
          )}

          {/* Leftover fields — never silently drop submitted data */}
          {steps && leftoverEntries.length > 0 && (
            <StepSection index={steps.length + 1} title="Additional responses" anchor={`step-${steps.length + 1}`}>
              <FieldRows pairs={leftoverEntries} />
            </StepSection>
          )}
        </main>
      </div>
    </div>
  );
}

// ─── Step section ───

function StepSection({
  index,
  title,
  anchor,
  children,
}: {
  index: number;
  title: string;
  anchor: string;
  children: React.ReactNode;
}) {
  return (
    <section id={anchor} className="scroll-mt-6">
      <h2 className="flex items-baseline gap-3 border-b border-stroke pb-2 dark:border-dark-3">
        <span className="font-mono text-xs font-semibold text-body">
          {String(index).padStart(2, "0")}
        </span>
        <span className="text-sm font-semibold text-dark dark:text-white">{title}</span>
      </h2>
      <div className="py-5">{children}</div>
    </section>
  );
}

// ─── Review record row ───

function RecordRow({
  tone,
  action,
  actor,
  at,
  comment,
  last,
}: {
  tone: "success" | "danger" | "info" | "neutral";
  action: string;
  actor?: string | null;
  at?: Date | null;
  comment?: string | null;
  last?: boolean;
}) {
  const bar =
    tone === "success"
      ? "bg-emerald-500"
      : tone === "danger"
        ? "bg-red-500"
        : tone === "info"
          ? "bg-indigo-500"
          : "bg-gray-300 dark:bg-gray-600";
  return (
    <li className={cn("px-6 py-3.5", !last && "border-b border-stroke dark:border-dark-3")}>
      <div className="flex items-baseline justify-between gap-4">
        <p className="flex items-center gap-2.5 text-sm font-semibold text-dark dark:text-white">
          <span className={cn("inline-block size-2 shrink-0 rounded-sm", bar)} aria-hidden />
          {action}
        </p>
        {at && (
          <time className="shrink-0 text-xs tabular-nums text-body">
            {new Date(at).toLocaleString()}
          </time>
        )}
      </div>
      {actor && <p className="mt-0.5 pl-[18px] text-xs text-body">{actor}</p>}
      {comment && (
        <blockquote className="mt-2 border-l-2 border-stroke pl-3 text-xs leading-relaxed text-body dark:border-dark-3">
          {comment}
        </blockquote>
      )}
    </li>
  );
}
