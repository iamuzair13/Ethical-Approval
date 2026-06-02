"use client";

import { cn } from "@/lib/utils";
import { useMemo, useState } from "react";

export type ViewAsUserOption = {
  id: string;
  name: string;
  email: string;
};

type SearchableUserSelectProps = {
  users: ViewAsUserOption[];
  loading?: boolean;
  onSelect: (user: ViewAsUserOption) => void;
  onCancel: () => void;
  title: string;
};

export function SearchableUserSelect({
  users,
  loading = false,
  onSelect,
  onCancel,
  title,
}: SearchableUserSelectProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return users;
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(normalized) ||
        user.email.toLowerCase().includes(normalized),
    );
  }, [query, users]);

  return (
    <div className="w-72 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-dark dark:text-white">{title}</p>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-medium text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          Back
        </button>
      </div>

      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by name or email…"
        className="mb-2 w-full rounded-lg border border-stroke bg-white px-3 py-2 text-sm text-dark outline-none focus:border-primary dark:border-dark-3 dark:bg-dark-2 dark:text-white"
        autoFocus
      />

      <div className="max-h-56 overflow-y-auto rounded-lg border border-stroke dark:border-dark-3">
        {loading ? (
          <p className="px-3 py-4 text-center text-sm text-slate-500">Loading users…</p>
        ) : filtered.length === 0 ? (
          <p className="px-3 py-4 text-center text-sm text-slate-500">No users found.</p>
        ) : (
          filtered.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => onSelect(user)}
              className={cn(
                "flex w-full flex-col items-start gap-0.5 border-b border-stroke px-3 py-2.5 text-left",
                "transition-colors hover:bg-gray-2 dark:border-dark-3 dark:hover:bg-dark-3",
                "last:border-b-0",
              )}
            >
              <span className="text-sm font-medium text-dark dark:text-white">{user.name}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">{user.email}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
