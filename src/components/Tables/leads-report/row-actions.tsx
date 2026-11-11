"use client";

import {
  Dropdown,
  DropdownClose,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  Download,
  Eye,
  FileBarChart,
  History,
  MessageSquare,
  Send,
  XCircle,
} from "lucide-react";
import type { SetStateActionType } from "@/types/set-state-action-type";
import type { Lead } from "./types";

type RowActionsProps = {
  lead: Lead;
  currentRole: "administrator" | "hod" | "ireb" | null;
  busyLeadId: number | null;
  isMenuOpen: boolean;
  onMenuOpenChange: SetStateActionType<boolean>;
  openUpward: boolean;
  onView: () => void;
  onDownload: () => void;
  onGetReports?: () => void;
  onViewFeedback?: () => void;
  onViewActionTrace?: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  onRecommend?: () => void;
  onMarkSensitive?: () => void;
};

export function RowActions({
  lead,
  currentRole,
  busyLeadId,
  isMenuOpen,
  onMenuOpenChange,
  openUpward,
  onView,
  onDownload,
  onGetReports,
  onViewFeedback,
  onViewActionTrace,
  onApprove,
  onReject,
  onRecommend,
  onMarkSensitive,
}: RowActionsProps) {
  const canDecide = lead.stage !== "completed" && Boolean(currentRole);
  const isBusy = busyLeadId === lead.id;
  // The admin review stage is handled by the administrator (IREB chairman).
  const isAdminStage = lead.stage === "admin";
  const canAdminRelease =
    isAdminStage && currentRole === "administrator" && Boolean(onRecommend || onMarkSensitive);

  const menuItemClass =
    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800";

  return (
    <Dropdown isOpen={isMenuOpen} setIsOpen={onMenuOpenChange}>
      <DropdownTrigger
        className={cn(
          "inline-flex h-9 w-full min-w-28 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-medium text-slate-600 transition-colors duration-150",
          "hover:bg-slate-50 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          "disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
        )}
        aria-label="Row actions"
        aria-expanded={isMenuOpen}
      >
        Actions
        <ChevronDown className="size-3.5 shrink-0 opacity-60" aria-hidden />
      </DropdownTrigger>
      <DropdownContent
        portalled
        placement={openUpward ? "top" : "bottom"}
        align="end"
        className="w-52 min-w-40 max-w-64 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-slate-900"
      >
        <DropdownClose>
          <button type="button" onClick={onView} className={menuItemClass}>
            <Eye className="size-3.5 text-primary dark:text-indigo-300" aria-hidden />
            View
          </button>
        </DropdownClose>
        <DropdownClose>
          <button
            type="button"
            disabled={isBusy}
            onClick={onDownload}
            className={menuItemClass}
          >
            <Download className="size-3.5" aria-hidden />
            Download
          </button>
        </DropdownClose>
        {currentRole === "administrator" && onGetReports && (
          <DropdownClose>
            <button type="button" onClick={onGetReports} className={menuItemClass}>
              <FileBarChart className="size-3.5" aria-hidden />
              Get Reports
            </button>
          </DropdownClose>
        )}
        {lead.latestFeedbackComment && onViewFeedback && (
          <DropdownClose>
            <button type="button" onClick={onViewFeedback} className={menuItemClass}>
              <MessageSquare className="size-3.5 text-primary dark:text-indigo-300" aria-hidden />
              View Feedback
            </button>
          </DropdownClose>
        )}
        {lead.latestActionTrace && onViewActionTrace && (
          <DropdownClose>
            <button type="button" onClick={onViewActionTrace} className={menuItemClass}>
              <History className="size-3.5" aria-hidden />
              View Action Trace
            </button>
          </DropdownClose>
        )}
        {canDecide && (onApprove || onReject) && (
          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
        )}
        {canDecide && onApprove && (
          <DropdownClose>
            <button
              type="button"
              disabled={isBusy}
              onClick={onApprove}
              className={cn(menuItemClass, "text-emerald-600 dark:text-emerald-400")}
            >
              <CheckCircle className="size-3.5" aria-hidden />
              Approve
            </button>
          </DropdownClose>
        )}
        {canDecide && onReject && (
          <DropdownClose>
            <button
              type="button"
              disabled={isBusy}
              onClick={onReject}
              className={cn(menuItemClass, "text-rose-600 dark:text-rose-400")}
            >
              <XCircle className="size-3.5" aria-hidden />
              Reject
            </button>
          </DropdownClose>
        )}
        {canAdminRelease && (onRecommend || onMarkSensitive) && (
          <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
        )}
        {canAdminRelease && onRecommend && (
          <DropdownClose>
            <button
              type="button"
              disabled={isBusy}
              onClick={onRecommend}
              className={cn(menuItemClass, "text-primary dark:text-indigo-300")}
            >
              <Send className="size-3.5" aria-hidden />
              Recommend
            </button>
          </DropdownClose>
        )}
        {canAdminRelease && onMarkSensitive && (
          <DropdownClose>
            <button
              type="button"
              disabled={isBusy}
              onClick={onMarkSensitive}
              className={cn(menuItemClass, "text-amber-600 dark:text-amber-400")}
            >
              <AlertTriangle className="size-3.5" aria-hidden />
              Mark as Sensitive
            </button>
          </DropdownClose>
        )}
      </DropdownContent>
    </Dropdown>
  );
}
