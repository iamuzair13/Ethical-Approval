"use client";

type SupervisorOption = { id: string; name: string; email: string };

export function SupervisorPickerSelect({
  supervisors,
  value,
  onChange,
  disabled,
  loading,
}: {
  supervisors: SupervisorOption[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-dark-5 dark:text-dark-6">
        Supervisor
      </span>
      <select
        disabled={disabled || loading}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full max-w-md rounded-lg border border-stroke bg-white px-3 py-2 text-sm font-medium text-dark dark:border-dark-3 dark:bg-gray-dark dark:text-white"
      >
        <option value="">{loading ? "Loading…" : "Select a supervisor…"}</option>
        {supervisors.map((d) => (
          <option key={d.id} value={d.id}>
            {d.name} — {d.email}
          </option>
        ))}
      </select>
    </label>
  );
}
