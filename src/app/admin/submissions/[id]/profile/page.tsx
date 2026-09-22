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

function formatSubmissionStatus(status: SubmissionStatus, hodName?: string | null): string {
  switch (status) {
    case "submitted":
    case "under_hod_review":
      return hodName ? `Under Review by ${hodName}` : "HOD not Assigned";
    case "hod_approved":
    case "under_admin_review":
    case "under_ireb_review":
      return "Under Review by IREB";
    case "hod_rejected":
      return "Rejected by HOD";
    case "approved":
      return "Approved by IREB";
    case "rejected":
      return "Rejected by IREB";
    default:
      return status;
  }
}

function statusTone(status: string): "success" | "danger" | "pending" {
  if (status.includes("Approved")) return "success";
  if (status.includes("Rejected")) return "danger";
  return "pending";
}

function decisionStageLabel(stage: string): string {
  if (stage === "hod") return "HOD";
  if (stage === "admin") return "Administrator";
  return "IREB";
}

function decisionLabel(decision: string): string {
  if (decision === "recommended") return "Recommended to IREB";
  if (decision === "marked_sensitive") return "Marked as sensitive";
  return decision;
}

// ─── Small presentational helpers ───

function Pill({ tone, children }: { tone: "success" | "danger" | "pending" | "info"; children: React.ReactNode }) {
  const cls =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400"
      : tone === "danger"
        ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
        : tone === "info"
          ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-300"
          : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold", cls)}>
      {children}
    </span>
  );
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-stroke bg-white shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card", className)}>
      {children}
    </section>
  );
}

function CardTitle({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div className="border-b border-stroke px-5 py-4 dark:border-dark-3">
      {eyebrow && (
        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">{eyebrow}</p>
      )}
      <h2 className="mt-0.5 text-base font-bold text-dark dark:text-white">{title}</h2>
    </div>
  );
}

function FieldLabel({ children, as: Tag = "dt" }: { children: React.ReactNode; as?: "dt" | "p" }) {
  return (
    <Tag className="text-xs font-bold uppercase tracking-wider text-dark dark:text-white">
      {children}
    </Tag>
  );
}

function MetaItem({ label, children, mono }: { label: string; children: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <FieldLabel>{label}</FieldLabel>
      <dd className={cn("mt-1 truncate text-sm font-medium text-dark dark:text-white", mono && "font-mono")}>
        {children}
      </dd>
    </div>
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
  const statusLabel = formatSubmissionStatus(submission.current_status, hodName);
  const documents = listSubmissionDocuments(submissionId, ethics);
  const decisions = await getApprovalDecisionsBySubmissionId(submissionId);

  const isAcceptedValue = (v: unknown) =>
    typeof v === "string" && ["yes", "true", "on", "accepted"].includes(v.trim().toLowerCase());
  const hasDeclaration =
    isAcceptedValue(formData?.declarationAccepted) ||
    isAcceptedValue(formData?.form3DeclarationAccepted) ||
    isAcceptedValue(formData?.publicationDeclarationAccepted);

  return (
    <div className="mx-auto w-full max-w-[1280px]">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-body transition hover:text-primary"
      >
        <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        All applications
      </Link>

      {/* ─── Hero card: identity + meta + title ─── */}
      <Card className="mb-6 overflow-hidden">
        <div className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-dark dark:text-white">
                {submission.applicant_name}
              </h1>
              <Pill tone={statusTone(statusLabel)}>{statusLabel}</Pill>
              {submission.is_sensitive && <Pill tone="danger">Sensitive</Pill>}
            </div>
            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-body">
              <span className="font-mono font-semibold text-primary">{submission.application_id}</span>
              <span aria-hidden>·</span>
              <span>{applicationType}</span>
              <span aria-hidden>·</span>
              <span>{submission.domain === "medical" ? "Medical" : "Non-medical"}</span>
              {requiredForm?.label && (
                <>
                  <span aria-hidden>·</span>
                  <span>{requiredForm.label.replace(/\.docx$/i, "")}</span>
                </>
              )}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            <ViewDocumentsButton
              applicationId={submission.application_id}
              documents={documents}
            />
            {submission.submission_attachment_count > 0 && (
              <p className="text-center text-xs text-body sm:text-right">
                {submission.submission_attachment_count} file
                {submission.submission_attachment_count === 1 ? "" : "s"} on record
              </p>
            )}
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-stroke bg-gray-1/50 px-6 py-4 dark:border-dark-3 dark:bg-dark-2/40 sm:grid-cols-4">
          <MetaItem label="Application type">{applicationType}</MetaItem>
          <MetaItem label="Domain">
            {submission.domain === "medical" ? "Medical" : "Non-medical"}
          </MetaItem>
          <MetaItem label="Submission attempt">
            {submission.applicant_attempt_number} of {submission.applicant_total_submissions}
          </MetaItem>
          <MetaItem label="Submitted">
            {new Date(submission.submitted_at).toLocaleString()}
          </MetaItem>
        </dl>
        <div className="border-t border-stroke px-6 py-4 dark:border-dark-3">
          <FieldLabel as="p">Title</FieldLabel>
          <p className="mt-1 text-base font-semibold leading-snug text-dark dark:text-white">
            {researchTitle}
          </p>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* ─── Left rail: people + review timeline ─── */}
        <aside className="flex flex-col gap-6 self-start lg:sticky lg:top-6">
          <Card>
            <CardTitle eyebrow="Applicant" title={submission.applicant_name} />
            <dl className="grid gap-4 px-5 py-4">
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
          </Card>

          {hodName && (
            <Card>
              <CardTitle eyebrow="Reviewing HOD" title={hodName} />
              <dl className="grid gap-4 px-5 py-4">
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
            </Card>
          )}

          <Card>
            <CardTitle eyebrow="Workflow" title="Review timeline" />
            <ol className="relative ml-5 mr-4 my-4 space-y-5 border-l border-stroke pl-5 dark:border-dark-3">
              <TimelineItem
                tone="neutral"
                title="Submitted"
                by={submission.applicant_name}
                at={submission.submitted_at}
              />
              {submission.assigned_ireb_name && (
                <TimelineItem
                  tone="info"
                  title="Recommended to IREB"
                  by={submission.assigned_ireb_name}
                />
              )}
              {[...decisions].reverse().map((d: ApprovalDecisionRow) => (
                <TimelineItem
                  key={d.id}
                  tone={d.decision === "approved" ? "success" : d.decision === "rejected" ? "danger" : "info"}
                  title={`${decisionStageLabel(d.stage as string)} ${decisionLabel(d.decision)}`}
                  by={d.decided_by_name}
                  at={d.decided_at}
                  comment={d.comment}
                />
              ))}
              {(submission.current_status === "approved" || submission.current_status === "rejected") && (
                <TimelineItem
                  tone={submission.current_status === "approved" ? "success" : "danger"}
                  title={submission.current_status === "approved" ? "Approved" : "Rejected"}
                />
              )}
            </ol>
          </Card>
        </aside>

        {/* ─── Main column: application content as steps ─── */}
        <main className="flex min-w-0 flex-col gap-6">
          {/* Step sections — same order the applicant filled them */}
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
                  <StepCard key={step.title} index={index + 1} title={step.title} anchor={`step-${index + 1}`}>
                    {documents.length > 0 ? (
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {documents.map((doc) => (
                          <li
                            key={doc.id}
                            className="flex items-center gap-2.5 rounded-lg border border-stroke px-3 py-2.5 dark:border-dark-3"
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
                  </StepCard>
                );
              }

              if (isDeclaration) {
                return (
                  <StepCard key={step.title} index={index + 1} title={step.title} anchor={`step-${index + 1}`}>
                    <div className="flex items-center gap-2.5">
                      <Pill tone={hasDeclaration ? "success" : "pending"}>
                        {hasDeclaration ? "Declaration accepted" : "Declaration status not recorded"}
                      </Pill>
                    </div>
                  </StepCard>
                );
              }

              return (
                <StepCard key={step.title} index={index + 1} title={step.title} anchor={`step-${index + 1}`}>
                  <FieldRows pairs={pairs} />
                </StepCard>
              );
            })
          ) : formData ? (
            <StepCard index={1} title="Application responses" anchor="step-1">
              <FieldRows
                pairs={Object.entries(formData).filter(([k]) => !isSkippedKey(k))}
              />
            </StepCard>
          ) : (
            <Card>
              <p className="px-5 py-6 text-sm text-body">No application form data recorded.</p>
            </Card>
          )}

          {/* Leftover fields — never silently drop submitted data */}
          {steps && leftoverEntries.length > 0 && (
            <StepCard index={steps.length + 1} title="Additional responses" anchor={`step-${steps.length + 1}`}>
              <FieldRows pairs={leftoverEntries} />
            </StepCard>
          )}
        </main>
      </div>
    </div>
  );
}

// ─── Step card ───

function StepCard({
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
    <section
      id={anchor}
      className="scroll-mt-6 overflow-hidden rounded-xl border border-stroke bg-white shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card"
    >
      <div className="flex items-center gap-3 border-b border-stroke bg-gray-1/50 px-5 py-3.5 dark:border-dark-3 dark:bg-dark-2/40">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-white">
          {index}
        </span>
        <h2 className="text-sm font-bold uppercase tracking-wide text-dark dark:text-white">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

// ─── Timeline item ───

function TimelineItem({
  tone,
  title,
  by,
  at,
  comment,
}: {
  tone: "success" | "danger" | "info" | "neutral";
  title: string;
  by?: string | null;
  at?: Date | null;
  comment?: string | null;
}) {
  const dot =
    tone === "success"
      ? "bg-emerald-500"
      : tone === "danger"
        ? "bg-red-500"
        : tone === "info"
          ? "bg-indigo-500"
          : "bg-gray-300 dark:bg-gray-600";
  return (
    <li className="relative">
      <span className={cn("absolute -left-[26.5px] top-1.5 size-2.5 rounded-full ring-4 ring-white dark:ring-gray-dark", dot)} />
      <p className="text-sm font-semibold leading-snug text-dark dark:text-white">{title}</p>
      <p className="mt-0.5 text-xs text-body">
        {[by, at ? new Date(at).toLocaleString() : null].filter(Boolean).join(" · ")}
      </p>
      {comment && (
        <p className="mt-1.5 whitespace-pre-wrap rounded-md bg-gray-1 px-2.5 py-2 text-xs leading-relaxed text-dark dark:bg-dark-2 dark:text-white">
          {comment}
        </p>
      )}
    </li>
  );
}
