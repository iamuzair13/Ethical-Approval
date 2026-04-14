"use client";

import { TrashIcon } from "@/assets/icons";
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
import { useMemo, useState } from "react";
import { DownloadIcon } from "../icons";

type LeadStatus = "Approved by Dean" | "Rejected by Dean" | "Approved by IERB" | "Rejected by IERB";

type Lead = {
  name: string;
  email: string;
  project: string;
  duration: string;
  status: LeadStatus;
  avatar: string;
};

const LEADS: Lead[] = [
  {
    name: "Ayesha Khan",
    email: "ayesha.khan@uol.edu.pk",
    project: "12 Jan 2026 - 18 Jan 2026",
    duration: "6 days",
    status: "Rejected by Dean",
    avatar: "/images/user/user-17.png",
  },
  {
    name: "Muhammad Ali",
    email: "m.ali@uol.edu.pk",
    project: "03 Feb 2026 - 4 Feb 2026",
    duration: "1 days",
    status: "Approved by Dean",
    avatar: "/images/user/user-15.png",
  },
  {
    name: "Fatima Noor",
    email: "fatima.noor@uol.edu.pk",
    project: "20 Mar 2026 - 27 Mar 2026",
    duration: "7 days",
    status: "Approved by IERB",
    avatar: "/images/user/user-19.png",
  },
  {
    name: "Hassan Raza",
    email: "hassan.raza@uol.edu.pk",
    project: "01 Apr 2026 - 04 Apr 2026",
    duration: "3 days",
    status: "Rejected by Dean",
    avatar: "/images/user/user-14.png",
  },
  {
    name: "Zainab Ahmed",
    email: "zainab.ahmed@uol.edu.pk",
    project: "15 May 2026 - 25 May 2026",
    duration: "10 days",
    status: "Rejected by IERB",
    avatar: "/images/user/user-21.png",
  },
];

type PropsType = {
  className?: string;
  deanOnly?: boolean;
  ethicalOnly?: boolean;
  title?: string;
};

export function LeadsReport({
  className,
  deanOnly = false,
  ethicalOnly = false,
  title = "Leads Report",
}: PropsType) {
  const [activeTab, setActiveTab] = useState<"all" | "overdue">("all");

  const leads = deanOnly
    ? LEADS.filter(({ status }) => status.includes("Dean"))
    : ethicalOnly
      ? LEADS.filter(({ status }) => status.includes("IERB"))
      : LEADS;

  const getDurationInDays = (duration: string) => {
    const days = Number.parseInt(duration, 10);
    return Number.isNaN(days) ? 0 : days;
  };

  const overdueLeads = useMemo(
    () => leads.filter((lead) => getDurationInDays(lead.duration) > 2),
    [leads],
  );

  const visibleLeads = activeTab === "overdue" ? overdueLeads : leads;

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
        </div>

        <Table>
          <TableHeader>
            <TableRow className="border-b text-base [&>th]:px-4 md:[&>th]:px-6 xl:[&>th]:px-7.5">
              <TableHead className="min-w-40">Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="min-w-40">Response In</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {visibleLeads.map((lead) => (
              <TableRow
                key={lead.email}
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
                      lead.status === "Approved by Dean"
                        ? "bg-[#10B981]/[0.08] text-green"
                        : lead.status === "Rejected by Dean"
                        ? "bg-[#FB5454]/[0.08] text-red"
                        : lead.status === "Approved by IERB"
                        ? "bg-[#10B981]/[0.08] text-green"
                        : "bg-[#FB5454]/[0.08] text-red",
                    )}
                  >
                    {lead.status}
                  </span>
                </TableCell>

                <TableCell className="text-center flex items-center justify-center gap-2">
                  <button title="Delete" className="hover:text-rose-500">
                    <span className="sr-only">Delete row</span>
                    <TrashIcon />
                  </button>
                  <button title="Download" className="hover:text-green-500">
                    <span className="sr-only">Download</span>
                    <DownloadIcon />
                  </button>
                </TableCell>
              </TableRow>
            ))}
            {visibleLeads.length === 0 && (
              <TableRow className="border-none">
                <TableCell colSpan={6} className="text-center text-dark-5">
                  No approval requests found for this tab.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
