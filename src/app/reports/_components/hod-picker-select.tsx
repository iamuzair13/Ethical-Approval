"use client";

import { SearchableSelect } from "@/components/ui/searchable-select";

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
    <SearchableSelect
      label="Supervisor"
      placeholder={loading ? "Loading…" : "Select a supervisor…"}
      searchPlaceholder="Search supervisors…"
      disabled={disabled || loading}
      loading={loading}
      options={supervisors.map((d) => ({
        value: d.id,
        label: d.name,
        hint: d.email,
      }))}
      value={value}
      onChange={onChange}
      triggerClassName="max-w-md"
    />
  );
}
