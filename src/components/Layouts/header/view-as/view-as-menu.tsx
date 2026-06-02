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

type ViewAsRole = "dean" | "ireb";

export function ViewAsMenu() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<"role" | "picker">("role");
  const [selectedRole, setSelectedRole] = useState<ViewAsRole | null>(null);
  const [users, setUsers] = useState<ViewAsUserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [starting, setStarting] = useState(false);

  const actingRole = session?.user?.actingAdminRole ?? session?.user?.adminRole;
  const viewAsActive = Boolean(session?.user?.viewAsActive);

  const resetFlow = useCallback(() => {
    setStep("role");
    setSelectedRole(null);
    setUsers([]);
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
          "rounded-lg border border-stroke px-3 py-2 text-sm font-medium",
          "text-dark transition-colors hover:bg-gray-2",
          "dark:border-dark-3 dark:text-white dark:hover:bg-dark-3",
        )}
      >
        View As
      </DropdownTrigger>

      <DropdownContent align="end" className="p-0">
        {step === "role" ? (
          <div className="w-48 py-1">
            <button
              type="button"
              onClick={() => void loadUsers("dean")}
              className="block w-full px-4 py-2.5 text-left text-sm font-medium text-dark hover:bg-gray-2 dark:text-white dark:hover:bg-dark-3"
            >
              Dean
            </button>
            <button
              type="button"
              onClick={() => void loadUsers("ireb")}
              className="block w-full px-4 py-2.5 text-left text-sm font-medium text-dark hover:bg-gray-2 dark:text-white dark:hover:bg-dark-3"
            >
              IREB
            </button>
          </div>
        ) : (
          <SearchableUserSelect
            users={users}
            loading={loadingUsers || starting}
            title={selectedRole === "dean" ? "Select Dean" : "Select IREB Member"}
            onSelect={(user) => void handleSelectUser(user)}
            onCancel={resetFlow}
          />
        )}
      </DropdownContent>
    </Dropdown>
  );
}
