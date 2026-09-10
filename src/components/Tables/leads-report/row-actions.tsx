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
    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium transition hover:bg-gray-50 dark:hover:bg-gray-700";

  return (
    <Dropdown isOpen={isMenuOpen} setIsOpen={onMenuOpenChange}>
      <DropdownTrigger
        className={cn(
          "inline-flex w-full min-w-28 items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition-all duration-150 ease-in-out",
          "hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/30 active:scale-[0.98]",
          "disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700",
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
        className="w-52 min-w-40 max-w-64 overflow-hidden rounded-lg border border-gray-200 bg-white p-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
      >
        <DropdownClose>
          <button type="button" onClick={onView} className={menuItemClass}>
            <Eye className="size-3.5 text-blue-600 dark:text-blue-400" aria-hidden />
            View
          </button>
        </DropdownClose>
        <DropdownClose>
          <button
            type="button"
            disabled={isBusy}
            onClick={onDownload}
            className={cn(menuItemClass, "text-gray-700 dark:text-gray-300")}
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
              <MessageSquare className="size-3.5 text-blue-600 dark:text-blue-400" aria-hidden />
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
          <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
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
              className={cn(menuItemClass, "text-red-600 dark:text-red-400")}
            >
              <XCircle className="size-3.5" aria-hidden />
              Reject
            </button>
          </DropdownClose>
        )}
        {canAdminRelease && (onRecommend || onMarkSensitive) && (
          <div className="my-1 border-t border-gray-100 dark:border-gray-700" />
        )}
        {canAdminRelease && onRecommend && (
          <DropdownClose>
            <button
              type="button"
              disabled={isBusy}
              onClick={onRecommend}
              className={cn(menuItemClass, "text-blue-600 dark:text-blue-400")}
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
