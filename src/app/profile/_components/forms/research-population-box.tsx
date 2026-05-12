"use client";

import { CheckboxGroup } from "./form-ui";

/* ============================================================
   Canonical Research Population options
   ============================================================
   Used as multi-select in every IREB form (theses + publications).
   ============================================================ */

export const RESEARCH_POPULATION_OPTIONS = [
  "University students",
  "Faculty members",
  "Librarians, Patients/healthcare workers",
  "Children/minors, General adults",
  "Employees/staff members",
  "Other (specify in methodology)",
] as const;

/* ============================================================
   Component
   ============================================================ */

export type ResearchPopulationBoxProps = {
  /** Predicate from the parent: `(v) => hasCsvOption(fieldKey, v)`. */
  isChecked: (value: string) => boolean;
  /** Toggler from the parent: `(v) => toggleCsvOption(fieldKey, v)`. */
  onToggle: (value: string) => void;
  /** Grid columns inside the box. Defaults to 2. */
  columns?: 1 | 2 | 3;
};

export function ResearchPopulationBox({
  isChecked,
  onToggle,
  columns = 2,
}: ResearchPopulationBoxProps) {
  return (
    <CheckboxGroup
      options={RESEARCH_POPULATION_OPTIONS}
      checkedFn={isChecked}
      toggleFn={onToggle}
      columns={columns}
    />
  );
}
