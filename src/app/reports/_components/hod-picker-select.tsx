"use client";

import { SearchableSelect } from "@/components/ui/searchable-select";

type HodOption = { id: string; name: string; email: string };

export function HodPickerSelect({
  hods,
  value,
  onChange,
  disabled,
  loading,
}: {
  hods: HodOption[];
  value: string;
  onChange: (id: string) => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <SearchableSelect
      label="HOD"
      placeholder={loading ? "Loading…" : "Select a hod…"}
      searchPlaceholder="Search hods…"
      disabled={disabled || loading}
      loading={loading}
      options={hods.map((d) => ({
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
