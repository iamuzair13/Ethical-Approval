"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DownloadIcon } from "../icons";

type LeadStatus =
  | "Submitted"
  | "Under Review by Dean"
  | "Approved by Dean"
  | "Rejected by Dean"
  | "Under Review by IREB"
  | "Approved by IREB"
  | "Rejected by IREB";

type Lead = {
  id: number;
  name: string;
  email: string;
  faculty: string;
  project: string;
  duration: string;
  passedStatus: LeadStatus;
  currentStatus: LeadStatus;
  stage: "dean" | "ireb" | "completed";
  avatar: string;
};

const LEADS: Lead[] = [
  {
    id: 1,
    name: "Ayesha Khan",
    email: "ayesha.khan@uol.edu.pk",
    faculty: "Faculty",
    project: "12 Jan 2026 - 18 Jan 2026",
    duration: "6 days",
    passedStatus: "Submitted",
    currentStatus: "Rejected by Dean",
    stage: "completed",
    avatar: "/images/user/user-17.png",
  },
  {
    id: 2,
    name: "Muhammad Ali",
    email: "m.ali@uol.edu.pk",
    faculty: "Faculty",
    project: "03 Feb 2026 - 4 Feb 2026",
    duration: "1 days",
    passedStatus: "Approved by Dean",
    currentStatus: "Under Review by IREB",
    stage: "ireb",
    avatar: "/images/user/user-15.png",
  },
  {
    id: 3,
    name: "Fatima Noor",
    email: "fatima.noor@uol.edu.pk",
    faculty: "Faculty",
    project: "20 Mar 2026 - 27 Mar 2026",
    duration: "7 days",
    passedStatus: "Approved by Dean",
    currentStatus: "Approved by IREB",
    stage: "completed",
    avatar: "/images/user/user-19.png",
  },
  {
    id: 4,
    name: "Hassan Raza",
    email: "hassan.raza@uol.edu.pk",
    faculty: "Faculty",
    project: "01 Apr 2026 - 04 Apr 2026",
    duration: "3 days",
    passedStatus: "Submitted",
    currentStatus: "Under Review by Dean",
    stage: "dean",
    avatar: "/images/user/user-14.png",
  },
  {
    id: 5,
    name: "Zainab Ahmed",
    email: "zainab.ahmed@uol.edu.pk",
    faculty: "Faculty",
    project: "15 May 2026 - 25 May 2026",
    duration: "10 days",
    passedStatus: "Approved by Dean",
    currentStatus: "Rejected by IREB",
    stage: "completed",
    avatar: "/images/user/user-21.png",
  },
];

type PropsType = {
  className?: string;
  deanOnly?: boolean;
  ethicalOnly?: boolean;
  title?: string;
  leads?: Lead[];
  currentRole?: "administrator" | "dean" | "ireb" | null;
};

type DecisionAction = "approved" | "rejected";
type AdminOption = { id: string; name: string; role: "dean" | "ireb" };

export function LeadsReport({
  className,
  deanOnly = false,
  ethicalOnly = false,
  title = "Leads Report",
  leads: providedLeads,
  currentRole = null,
}: PropsType) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"all" | "overdue">("all");
  const [busyLeadId, setBusyLeadId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [decisionLead, setDecisionLead] = useState<Lead | null>(null);
  const [decisionAction, setDecisionAction] = useState<DecisionAction>("approved");
  const [decisionComment, setDecisionComment] = useState("");
  const [adminOptions, setAdminOptions] = useState<{
    deanOption: AdminOption | null;
    irebOptions: AdminOption[];
  }>({ deanOption: null, irebOptions: [] });
  const [selectedOnBehalfOf, setSelectedOnBehalfOf] = useState("");

  const sourceLeads = providedLeads ?? LEADS;
  const leads = providedLeads
    ? sourceLeads
    : deanOnly
      ? sourceLeads.filter(({ stage }) => stage === "dean")
      : ethicalOnly
        ? sourceLeads.filter(({ stage }) => stage === "ireb")
        : sourceLeads;

  const getDurationInDays = (duration: string) => {
    const days = Number.parseInt(duration, 10);
    return Number.isNaN(days) ? 0 : days;
  };

  const overdueLeads = useMemo(
    () => leads.filter((lead) => getDurationInDays(lead.duration) > 2),
    [leads],
  );

  const visibleLeads = activeTab === "overdue" ? overdueLeads : leads;

  useEffect(() => {
    if (!decisionLead || currentRole !== "administrator") return;
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch(`/api/submissions/${decisionLead.id}/action-options`, {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          ok: boolean;
          deanOption?: AdminOption | null;
          irebOptions?: AdminOption[];
        };
        if (!response.ok || !payload.ok || cancelled) return;
        setAdminOptions({
          deanOption: payload.deanOption ?? null,
          irebOptions: payload.irebOptions ?? [],
        });
        if (decisionLead.stage === "dean" && payload.deanOption?.id) {
          setSelectedOnBehalfOf(payload.deanOption.id);
        }
        if (decisionLead.stage === "ireb" && payload.irebOptions?.[0]?.id) {
          setSelectedOnBehalfOf(payload.irebOptions[0].id);
        }
      } catch {
        if (!cancelled) setActionError("Unable to load approval options.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentRole, decisionLead]);

  const resetDecisionModal = () => {
    setDecisionLead(null);
    setDecisionComment("");
    setSelectedOnBehalfOf("");
    setAdminOptions({ deanOption: null, irebOptions: [] });
  };

  const openDecisionModal = (lead: Lead, action: DecisionAction) => {
    setActionError(null);
    setDecisionAction(action);
    setDecisionComment("");
    setSelectedOnBehalfOf("");
    setAdminOptions({ deanOption: null, irebOptions: [] });
    setDecisionLead(lead);
  };

  const handleDownload = async (lead: Lead) => {
    setBusyLeadId(lead.id);
    setActionError(null);
    try {
      const response = await fetch(`/api/submissions/${lead.id}`, { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok || !payload?.ok) {
        setActionError(payload?.error ?? "Unable to download submission.");
        return;
      }
      const blob = new Blob([JSON.stringify(payload.submission, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `submission-${lead.id}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setActionError("Network error while downloading submission.");
    } finally {
      setBusyLeadId(null);
    }
  };

  const handleDecisionSubmit = async () => {
    if (!decisionLead) return;
    if (currentRole === "administrator" && !selectedOnBehalfOf) {
      setActionError("Please select who this action is on behalf of.");
      return;
    }

    setBusyLeadId(decisionLead.id);
    setActionError(null);
    try {
      const response = await fetch(`/api/submissions/${decisionLead.id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: decisionAction,
          comment: decisionComment,
          onBehalfOfAdminId: currentRole === "administrator" ? selectedOnBehalfOf : undefined,
        }),
      });
      const payload = (await response.json()) as { ok: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        setActionError(payload.error ?? "Unable to save decision.");
        return;
      }
      resetDecisionModal();
      router.refresh();
    } catch {
      setActionError("Network error while saving decision.");
    } finally {
      setBusyLeadId(null);
    }
  };

  return (
    <div className={cn("col-span-12", className)}>
      <div className="rounded-[10px] bg-white shadow-1 dark:bg-gray-dark dark:shadow-card">
        <div className="flex items-start justify-between p-4 sm:p-6 xl:p-7.5">
          <h2 className="text-[22px] font-bold text-black dark:text-white">
            {title}
          </h2>

          <div className="relative">
            <button className="hover:text-primary" aria-expanded="false" aria-haspopup="menu">
              <span className="sr-only">Open menu</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <path d="M2 10C3.10457 10 4 9.10457 4 8C4 6.89543 3.10457 6 2 6C0.89543 6 0 6.89543 0 8C0 9.10457 0.89543 10 2 10Z" />
                <path d="M8 10C9.10457 10 10 9.10457 10 8C10 6.89543 9.10457 6 8 6C6.89543 6 6 6.89543 6 8C6 9.10457 6.89543 10 8 10Z" />
                <path d="M14 10C15.1046 10 16 9.10457 16 8C16 6.89543 15.1046 6 14 6C12.8954 6 12 6.89543 12 8C12 9.10457 12.8954 10 14 10Z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-4 pb-4 sm:px-6 xl:px-7.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                activeTab === "all"
                  ? "bg-primary text-white"
                  : "bg-gray-2 text-dark hover:bg-primary/15 dark:bg-dark-2 dark:text-white",
              )}
              onClick={() => setActiveTab("all")}
            >
              All Requests ({leads.length})
            </button>
            <button
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                activeTab === "overdue"
                  ? "bg-red text-white"
                  : "bg-red/10 text-red hover:bg-red/20",
              )}
              onClick={() => setActiveTab("overdue")}
            >
              Over Due Approval ({overdueLeads.length})
            </button>
          </div>

          {overdueLeads.length > 0 && (
            <div className="mt-3 rounded-md border border-red/35 bg-red/10 px-3 py-2 text-sm font-medium text-red dark:border-red/50 dark:bg-red/15">
              Attention required: {overdueLeads.length} approval request
              {overdueLeads.length > 1 ? "s have" : " has"} not been responded
              to within 2 days.
            </div>
          )}
          {actionError && (
            <div className="mt-3 rounded-md border border-red/35 bg-red/10 px-3 py-2 text-sm font-medium text-red dark:border-red/50 dark:bg-red/15">
              {actionError}
            </div>
          )}
        </div>

        <Table>
          <TableHeader>
            <TableRow className="border-b text-base [&>th]:px-4 md:[&>th]:px-6 xl:[&>th]:px-7.5">
              <TableHead className="min-w-40">Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="min-w-40">Response In</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Passed Status</TableHead>
              <TableHead>Current Status </TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {visibleLeads.map((lead) => {
              return (
                <TableRow
                  key={lead.id}
                  className="border-none text-base font-medium [&>td]:px-4 md:[&>td]:px-6 xl:[&>td]:px-7.5"
                >
                <TableCell>
                  <figure className="flex items-center gap-4.5">
                    <Image
                      src={lead.avatar}
                      alt={lead.name}
                      width={44}
                      height={44}
                      className="rounded-full"
                    />
                    <figcaption className="truncate font-medium">
                      {lead.name}
                    </figcaption>
                  </figure>
                </TableCell>

                <TableCell>
                  <a className="hover:underline" href={`mailto:${lead.email}`}>
                    {lead.email}
                  </a>
                </TableCell>

                <TableCell>{lead.project}</TableCell>
                <TableCell>{lead.duration}</TableCell>

                
                <TableCell>
                  <span
                    className={cn(
                      "inline-block truncate rounded px-2.5 py-1 text-sm font-medium capitalize",
                      lead.passedStatus === "Approved by Dean" ||
                        lead.passedStatus === "Approved by IREB"
                        ? "bg-[#10B981]/[0.08] text-green"
                        : lead.passedStatus === "Rejected by Dean" ||
                            lead.passedStatus === "Rejected by IREB"
                        ? "bg-[#FB5454]/[0.08] text-red"
                        : "bg-amber-100 text-amber-700",
                    )}
                  >
                    {lead.passedStatus}
                  </span>
                </TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        "inline-block truncate rounded px-2.5 py-1 text-sm font-medium capitalize",
                        lead.currentStatus === "Approved by Dean" ||
                          lead.currentStatus === "Approved by IREB"
                          ? "bg-[#10B981]/[0.08] text-green"
                          : lead.currentStatus === "Rejected by Dean" ||
                              lead.currentStatus === "Rejected by IREB"
                          ? "bg-[#FB5454]/[0.08] text-red"
                          : "bg-amber-100 text-amber-700",
                      )}
                    >
                      {lead.currentStatus}
                    </span>
                </TableCell>

                <TableCell>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => router.push(`/admin/submissions/${lead.id}/profile`)}
                      className="rounded-md border border-stroke px-3 py-1.5 text-xs font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      disabled={busyLeadId === lead.id}
                      onClick={() => void handleDownload(lead)}
                      className="rounded-md border border-primary px-3 py-1.5 text-xs font-medium text-primary transition hover:bg-primary/10 disabled:opacity-60"
                    >
                      Download
                    </button>
                    {lead.stage !== "completed" && currentRole && (
                      <>
                        <button
                          type="button"
                          disabled={busyLeadId === lead.id}
                          onClick={() => openDecisionModal(lead, "approved")}
                          className="rounded-md bg-green px-3 py-1.5 text-xs font-medium text-white transition hover:bg-green/90 disabled:opacity-60"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={busyLeadId === lead.id}
                          onClick={() => openDecisionModal(lead, "rejected")}
                          className="rounded-md bg-red px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red/90 disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </TableCell>
                </TableRow>
              );
            })}
            {visibleLeads.length === 0 && (
              <TableRow className="border-none">
                <TableCell colSpan={7} className="text-center text-dark-5">
                  No approval requests found for this tab.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {decisionLead && (
        <div className="fixed inset-0 z-[99998] flex items-center justify-center bg-dark/60 px-4 py-6 backdrop-blur-[2px]">
          <div className="w-full max-w-2xl rounded-[12px] border border-stroke bg-white p-6 shadow-1 dark:border-dark-3 dark:bg-gray-dark dark:shadow-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-heading-6 font-bold text-dark dark:text-white">
                  {decisionAction === "approved" ? "Approve Request" : "Reject Request"}
                </h3>
                <p className="mt-1 text-sm text-body">
                  {decisionLead.name} · {decisionLead.faculty}
                </p>
              </div>
              <button
                type="button"
                onClick={resetDecisionModal}
                className="rounded-md border border-stroke px-3 py-1.5 text-sm font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
              >
                Close
              </button>
            </div>

            {currentRole === "administrator" && (
              <div className="mt-5 grid gap-4">
                {decisionLead.stage === "dean" && (
                  <div className="rounded-lg border border-stroke p-4 dark:border-dark-3">
                    <p className="text-sm font-semibold text-dark dark:text-white">On behalf of dean</p>
                    <select
                      value={selectedOnBehalfOf}
                      onChange={(e) => setSelectedOnBehalfOf(e.target.value)}
                      className="mt-3 w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"
                    >
                      <option value="">Select dean</option>
                      {adminOptions.deanOption && (
                        <option value={adminOptions.deanOption.id}>
                          {adminOptions.deanOption.name}
                        </option>
                      )}
                    </select>
                  </div>
                )}

                {decisionLead.stage === "ireb" && (
                  <div className="rounded-lg border border-stroke p-4 dark:border-dark-3">
                    <p className="text-sm font-semibold text-dark dark:text-white">On behalf of IREB member</p>
                    <select
                      value={selectedOnBehalfOf}
                      onChange={(e) => setSelectedOnBehalfOf(e.target.value)}
                      className="mt-3 w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"
                    >
                      <option value="">Select IREB member</option>
                      {adminOptions.irebOptions.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="mt-5">
              <label className="mb-2 block text-sm font-semibold text-dark dark:text-white">
                {decisionAction === "rejected" ? "Rejection Comment" : "Comment (optional)"}
              </label>
              <textarea
                value={decisionComment}
                onChange={(e) => setDecisionComment(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-stroke bg-transparent px-4 py-2.5 dark:border-dark-3"
                placeholder={
                  decisionAction === "rejected"
                    ? "Provide reason for rejection"
                    : "Optional note"
                }
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={resetDecisionModal}
                className="rounded-md border border-stroke px-4 py-2 text-sm font-medium text-dark transition hover:bg-gray-1 dark:border-dark-3 dark:text-white dark:hover:bg-dark-2"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busyLeadId === decisionLead.id}
                onClick={() => void handleDecisionSubmit()}
                className={cn(
                  "rounded-md px-4 py-2 text-sm font-medium text-white transition disabled:opacity-60",
                  decisionAction === "approved" ? "bg-green hover:bg-green/90" : "bg-red hover:bg-red/90",
                )}
              >
                {decisionAction === "approved" ? "Confirm Approval" : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
