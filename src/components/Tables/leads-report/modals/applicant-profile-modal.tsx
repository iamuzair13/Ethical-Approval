"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import {
  User,
  Hash,
  Mail,
  Building2,
  GraduationCap,
  BookOpen,
  FlaskConical,
  Users,
  Target,
  ClipboardList,
  CalendarDays,
  CalendarCheck2,
  CalendarClock,
  FileText,
  Paperclip,
  RotateCcw,
  Stethoscope,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { ModalShell } from "../modal-shell";
import type { Lead } from "../types";

type SubmissionDetail = {
  id: number;
  application_id: string;
  type: "thesis" | "publication";
  domain: "medical" | "non_medical";
  current_status: string;
  submitted_at: string;
  title: string | null;
  objectives: string | null;
  methodology: string | null;
  participants_range: string | null;
  research_population: string | null;
  applicant_name: string;
  applicant_email: string;
  applicant_faculty: string;
  applicant_department: string;
  applicant_program: string | null;
  applicant_sap_id: string;
  applicant_attempt_number: number;
  applicant_total_submissions: number;
  supervisor_decision_at: string | null;
  ireb_decision_at: string | null;
  submission_attachment_count: number;
  start_date: string | null;
  end_date: string | null;
};

type ApplicantProfileModalProps = {
  lead: Lead;
  onClose: () => void;
};

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------

type AccentColor = "blue" | "purple" | "amber";

const ACCENT_STYLES: Record<AccentColor, { badge: string; ring: string }> = {
  blue: {
    badge: "bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400",
    ring: "ring-blue-100 dark:ring-blue-900/40",
  },
  purple: {
    badge: "bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400",
    ring: "ring-purple-100 dark:ring-purple-900/40",
  },
  amber: {
    badge: "bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400",
    ring: "ring-amber-100 dark:ring-amber-900/40",
  },
};

function SectionCard({
  icon: Icon,
  title,
  color,
  children,
}: {
  icon: LucideIcon;
  title: string;
  color: AccentColor;
  children: React.ReactNode;
}) {
  const styles = ACCENT_STYLES[color];
  return (
    <section
      className={`rounded-xl border border-gray-100 bg-white p-4 ring-1 ${styles.ring} dark:border-gray-800 dark:bg-gray-900/40`}
    >
      <div className="mb-3 flex items-center gap-2.5">
        <span className={`flex size-8 items-center justify-center rounded-lg ${styles.badge}`}>
          <Icon className="size-4" />
        </span>
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
      </div>
      {children}
    </section>
  );
}

function InfoRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | null | undefined;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex items-start gap-2 py-2">
      {Icon && <Icon className="mt-0.5 size-3.5 shrink-0 text-gray-400 dark:text-gray-500" />}
      <div className="min-w-0 flex-1">
        <dt className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {label}
        </dt>
        <dd className="truncate text-sm text-gray-900 dark:text-white">
          {value && value.trim() ? value : "—"}
        </dd>
      </div>
    </div>
  );
}

function TypePill({ type }: { type: SubmissionDetail["type"] }) {
  const isThesis = type === "thesis";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
        isThesis
          ? "bg-indigo-50 text-indigo-700 ring-indigo-600/20 dark:bg-indigo-950/40 dark:text-indigo-400 dark:ring-indigo-500/30"
          : "bg-cyan-50 text-cyan-700 ring-cyan-600/20 dark:bg-cyan-950/40 dark:text-cyan-400 dark:ring-cyan-500/30"
      }`}
    >
      <BookOpen className="size-3" />
      {isThesis ? "Thesis" : "Research Publication"}
    </span>
  );
}

function DomainPill({ domain }: { domain: SubmissionDetail["domain"] }) {
  const isMedical = domain === "medical";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${
        isMedical
          ? "bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-950/40 dark:text-rose-400 dark:ring-rose-500/30"
          : "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-500/30"
      }`}
    >
      <Stethoscope className="size-3" />
      {isMedical ? "Medical" : "Non-Medical"}
    </span>
  );
}

function getStatusStyles(status: string) {
  const s = status.toLowerCase();
  if (s.includes("approved") || s.includes("accepted"))
    return "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-400 dark:ring-emerald-500/30";
  if (s.includes("rejected") || s.includes("declined"))
    return "bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-950/40 dark:text-red-400 dark:ring-red-500/30";
  if (s.includes("review"))
    return "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-400 dark:ring-amber-500/30";
  return "bg-gray-100 text-gray-700 ring-gray-500/20 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-500/30";
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${getStatusStyles(
        status,
      )}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ApplicantProfileModal({ lead, onClose }: ApplicantProfileModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<SubmissionDetail | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const response = await fetch(`/api/submissions/${lead.id}`, { cache: "no-store" });
        const payload = (await response.json()) as {
          ok?: boolean;
          error?: string;
          submission?: SubmissionDetail;
        };
        if (cancelled) return;
        if (!response.ok || !payload.ok || !payload.submission) {
          setError(payload.error ?? "Unable to load applicant profile.");
          return;
        }
        setDetail(payload.submission);
      } catch {
        if (!cancelled) setError("Network error while loading applicant profile.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [lead.id]);

  if (typeof document === "undefined") return null;

  const statusLabel =
    lead.currentStatus === "Under Review by Supervisor" && lead.supervisorName
      ? `Under Review by ${lead.supervisorName}`
      : lead.currentStatus;
  const isStudentApplicant = detail?.applicant_email
    .trim()
    .toLowerCase()
    .endsWith("@student.uol.edu.pk") ?? false;

  return createPortal(
    <ModalShell
      open
      onClose={onClose}
      title="Applicant Profile"
      maxWidth="5xl"
      description={
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
            <Hash className="size-3.5" />
            {lead.applicationId}
          </span>
          <span className="text-gray-300 dark:text-gray-600">·</span>
          <span className="inline-flex items-center gap-1.5">
            <User className="size-3.5" />
            {lead.name}
          </span>
          <StatusBadge status={statusLabel} />
        </div>
      }
    >
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="size-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
        </div>
      )}

      {error && !loading && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
          {error}
        </div>
      )}

      {detail && !loading && (
        <div className="space-y-5">
          {/* Applicant Information */}
          <SectionCard icon={User} title="Applicant Information" color="blue">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-0.5 sm:grid-cols-2 lg:grid-cols-3">
              <InfoRow label="Full Name" value={detail.applicant_name} icon={User} />
              <InfoRow label="SAP ID" value={detail.applicant_sap_id} icon={Hash} />
              <InfoRow label="Email" value={detail.applicant_email} icon={Mail} />
              <InfoRow
                label="Applicant Type"
                value={isStudentApplicant ? "Student" : "Faculty / Staff"}
                icon={GraduationCap}
              />
              <InfoRow label="Faculty" value={detail.applicant_faculty} icon={Building2} />
              <InfoRow label="Department" value={detail.applicant_department} icon={Layers} />
              {isStudentApplicant && detail.applicant_program && (
                <InfoRow label="Program" value={detail.applicant_program} icon={GraduationCap} />
              )}
            </dl>
          </SectionCard>

          {/* Research Information */}
          <SectionCard icon={FlaskConical} title="Research Information" color="purple">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-0.5 sm:grid-cols-2 lg:grid-cols-3">
              <InfoRow label="Research Title" value={detail.title} icon={FileText} />
              <div className="flex flex-col gap-1.5 py-2">
                <dt className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Application Type
                </dt>
                <dd>
                  <TypePill type={detail.type} />
                </dd>
              </div>
              <div className="flex flex-col gap-1.5 py-2">
                <dt className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Domain
                </dt>
                <dd>
                  <DomainPill domain={detail.domain} />
                </dd>
              </div>
              {detail.participants_range && (
                <InfoRow label="Participants Range" value={detail.participants_range} icon={Users} />
              )}
              {detail.research_population && (
                <InfoRow
                  label="Research Population"
                  value={detail.research_population}
                  icon={Target}
                />
              )}
              {detail.type === "thesis" && detail.start_date && (
                <InfoRow label="Start Date" value={formatDate(detail.start_date)} icon={CalendarDays} />
              )}
              {detail.type === "thesis" && detail.end_date && (
                <InfoRow label="End Date" value={formatDate(detail.end_date)} icon={CalendarCheck2} />
              )}
            </dl>
          </SectionCard>

          {/* Submission Information */}
          <SectionCard icon={ClipboardList} title="Submission Information" color="amber">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-0.5 sm:grid-cols-2 lg:grid-cols-3">
              <InfoRow label="Application ID" value={detail.application_id} icon={Hash} />
              <InfoRow
                label="Submitted On"
                value={formatDate(detail.submitted_at)}
                icon={CalendarDays}
              />
              <div className="flex flex-col gap-1.5 py-2">
                <dt className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Current Status
                </dt>
                <dd>
                  <StatusBadge status={statusLabel} />
                </dd>
              </div>
              <InfoRow
                label="Attempt"
                value={`${detail.applicant_attempt_number} of ${detail.applicant_total_submissions}`}
                icon={RotateCcw}
              />
              {isStudentApplicant && (
                <InfoRow
                  label="Supervisor Decision"
                  value={detail.supervisor_decision_at ? formatDate(detail.supervisor_decision_at) : "Pending"}
                  icon={CalendarClock}
                />
              )}
              <InfoRow
                label="IREB Decision"
                value={detail.ireb_decision_at ? formatDate(detail.ireb_decision_at) : "Pending"}
                icon={CalendarClock}
              />
              <InfoRow
                label="Attachments Uploaded"
                value={String(detail.submission_attachment_count)}
                icon={Paperclip}
              />
            </dl>
          </SectionCard>

          {detail.objectives && (
            <SectionCard icon={Target} title="Objectives" color="purple">
              <p className="whitespace-pre-wrap rounded-lg bg-purple-50/50 p-4 text-sm leading-relaxed text-gray-700 dark:bg-purple-950/20 dark:text-gray-300">
                {detail.objectives}
              </p>
            </SectionCard>
          )}

          {detail.methodology && (
            <SectionCard icon={FlaskConical} title="Methodology" color="purple">
              <p className="whitespace-pre-wrap rounded-lg bg-purple-50/50 p-4 text-sm leading-relaxed text-gray-700 dark:bg-purple-950/20 dark:text-gray-300">
                {detail.methodology}
              </p>
            </SectionCard>
          )}
        </div>
      )}
    </ModalShell>,
    document.body,
  );
}