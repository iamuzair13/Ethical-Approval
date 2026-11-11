"use client";

import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { SearchableUserSelect, type ViewAsUserOption } from "./searchable-user-select";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { NON_ADMIN_LANDING_PAGE } from "@/lib/post-login-redirect";

type ViewAsRole = "hod" | "ireb";

export function ViewAsMenu() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"role" | "picker" | "student">("role");
  const [selectedRole, setSelectedRole] = useState<ViewAsRole | null>(null);
  const [users, setUsers] = useState<ViewAsUserOption[]>([]);
  const [sapId, setSapId] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [starting, setStarting] = useState(false);

  const actingRole = session?.user?.actingAdminRole ?? session?.user?.adminRole;
  const viewAsActive = Boolean(session?.user?.viewAsActive);

  const resetFlow = useCallback(() => {
    setStep("role");
    setSelectedRole(null);
    setUsers([]);
    setSapId("");
    setLoadingUsers(false);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    resetFlow();
  }, [resetFlow]);

  const loadUsers = useCallback(async (role: ViewAsRole) => {
    setLoadingUsers(true);
    try {
      const response = await fetch(`/api/admin/view-as/options?role=${role}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        users?: ViewAsUserOption[];
        error?: string;
      };
      if (!response.ok || !payload.ok || !payload.users) {
        toast.error(payload.error ?? "Could not load users.");
        return;
      }
      setUsers(payload.users);
      setSelectedRole(role);
      setStep("picker");
    } catch {
      toast.error("Could not load users.");
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const handleSelectUser = useCallback(
    async (user: ViewAsUserOption) => {
      if (!selectedRole || starting) return;
      setStarting(true);
      try {
        const response = await fetch("/api/admin/view-as/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetAdminId: user.id, role: selectedRole }),
        });
        const payload = (await response.json()) as { ok?: boolean; error?: string };
        if (!response.ok || !payload.ok) {
          toast.error(payload.error ?? "Could not start View As mode.");
          return;
        }

        await update({
          action: "startViewAs",
          targetAdminId: user.id,
          viewAsRole: selectedRole,
        });
        handleClose();
        router.refresh();
        toast.success(`Now viewing as ${user.name}.`);
      } catch {
        toast.error("Could not start View As mode.");
      } finally {
        setStarting(false);
      }
    },
    [selectedRole, starting, update, handleClose, router],
  );

  const handleStartStudent = useCallback(async () => {
    const id = sapId.trim();
    if (!id || starting) return;
    setStarting(true);
    try {
      const response = await fetch("/api/admin/view-as/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "student", sapId: id }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        target?: { id: string; name: string };
      };
      if (!response.ok || !payload.ok || !payload.target) {
        toast.error(payload.error ?? "Could not start View As mode.");
        return;
      }

      await update({
        action: "startViewAsStudent",
        targetSapId: payload.target.id,
      });
      handleClose();
      // A student has no admin role — land on the non-admin home page.
      router.push(NON_ADMIN_LANDING_PAGE);
      router.refresh();
      toast.success(`Now viewing as ${payload.target.name}.`);
    } catch {
      toast.error("Could not start View As mode.");
    } finally {
      setStarting(false);
    }
  }, [sapId, starting, update, handleClose, router]);

  if (actingRole !== "administrator" || viewAsActive) {
    return null;
  }

  return (
    <Dropdown
      isOpen={isOpen}
      setIsOpen={(open) => {
        setIsOpen(open);
        if (!open) resetFlow();
      }}
    >
      <DropdownTrigger
        className={cn(
          "inline-flex h-10 items-center rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium",
          "text-slate-600 transition-colors duration-150 hover:bg-slate-50 hover:text-slate-900",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          "dark:border-slate-700 dark:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
        )}
      >
        View As
      </DropdownTrigger>

      <DropdownContent align="end" className="p-0">
        {step === "role" && (
          <div className="w-48 py-1">
            <button
              type="button"
              onClick={() => void loadUsers("hod")}
              className="block w-full px-4 py-2.5 text-left text-sm font-medium text-dark hover:bg-gray-2 dark:text-white dark:hover:bg-dark-3"
            >
              HOD
            </button>
            <button
              type="button"
              onClick={() => void loadUsers("ireb")}
              className="block w-full px-4 py-2.5 text-left text-sm font-medium text-dark hover:bg-gray-2 dark:text-white dark:hover:bg-dark-3"
            >
              IREB
            </button>
            <button
              type="button"
              onClick={() => setStep("student")}
              className="block w-full px-4 py-2.5 text-left text-sm font-medium text-dark hover:bg-gray-2 dark:text-white dark:hover:bg-dark-3"
            >
              Student
            </button>
          </div>
        )}

        {step === "picker" && (
          <SearchableUserSelect
            users={users}
            loading={loadingUsers || starting}
            title={selectedRole === "hod" ? "Select HOD" : "Select IREB Member"}
            onSelect={(user) => void handleSelectUser(user)}
            onCancel={resetFlow}
          />
        )}

        {step === "student" && (
          <div className="w-72 p-3">
            <div className="mb-3 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-dark dark:text-white">
                View as Student
              </p>
              <button
                type="button"
                onClick={resetFlow}
                className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                Back
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleStartStudent();
              }}
            >
              <label
                htmlFor="view-as-sap-id"
                className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400"
              >
                Student SAP ID
              </label>
              <input
                id="view-as-sap-id"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                value={sapId}
                onChange={(e) => setSapId(e.target.value)}
                placeholder="e.g. 70088579"
                className="mb-2 w-full rounded-lg border border-stroke bg-white px-3 py-2 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
                autoFocus
              />
              <p className="mb-2 text-xs text-slate-400 dark:text-slate-500">
                The app will open the student profile exactly as if that student signed in.
              </p>
              <button
                type="submit"
                disabled={!sapId.trim() || starting}
                className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-60"
              >
                {starting ? "Starting…" : "View as Student"}
              </button>
            </form>
          </div>
        )}
      </DropdownContent>
    </Dropdown>
  );
}
