import { db } from "@/lib/db";
import { normalizeSapFacultyValue } from "@/lib/admin-rbac";

export type FacultySeed = {
  code: string;
  name: string;
  sapAliases: string[];
};

export const DEFAULT_FACULTY_SEEDS: FacultySeed[] = [
  { code: "ARTS_HUMANITIES", name: "Arts and Humanities", sapAliases: [] },
  { code: "BUSINESS", name: "Business Administration", sapAliases: [] },
  { code: "COMPUTING_IT", name: "Computing and Information Technology", sapAliases: [] },
  { code: "DENTISTRY", name: "Dentistry", sapAliases: [] },
  { code: "EASTERN_MEDICINE", name: "Eastern Medicine", sapAliases: [] },
  { code: "EDUCATION", name: "Education", sapAliases: [] },
  { code: "ENGINEERING", name: "Engineering", sapAliases: [] },
  { code: "HEALTH_SCIENCES", name: "Health Sciences", sapAliases: [] },
  { code: "LAW", name: "Law", sapAliases: [] },
  { code: "MEDICINE_ALLIED", name: "Medicine and Allied Health Sciences", sapAliases: [] },
  { code: "SOCIAL_SCIENCES", name: "Social Sciences", sapAliases: [] },
];

export async function seedFaculties(faculties: FacultySeed[]) {
  for (const faculty of faculties) {
    const result = await db.query<{ id: number }>(
      `
        INSERT INTO faculties (code, name)
        VALUES ($1, $2)
        ON CONFLICT (code)
        DO UPDATE SET
          name = EXCLUDED.name,
          is_active = TRUE,
          updated_at = NOW()
        RETURNING id
      `,
      [faculty.code, faculty.name],
    );

    const facultyId = result.rows[0].id;
    for (const alias of faculty.sapAliases) {
      await db.query(
        `
          INSERT INTO faculty_sap_aliases (faculty_id, sap_value_normalized, source_system)
          VALUES ($1, $2, 'sap_bootstrap')
          ON CONFLICT (sap_value_normalized)
          DO UPDATE SET
            faculty_id = EXCLUDED.faculty_id,
            updated_at = NOW()
        `,
        [facultyId, normalizeSapFacultyValue(alias)],
      );
    }
  }
}

export async function getUnknownSapFacultyValues(values: string[]) {
  const unknown: string[] = [];
  for (const value of values) {
    const normalized = normalizeSapFacultyValue(value);
    const result = await db.query(
      `
        SELECT 1
        FROM faculty_sap_aliases
        WHERE sap_value_normalized = $1
        LIMIT 1
      `,
      [normalized],
    );
    if (result.rowCount === 0) {
      unknown.push(normalized);
    }
  }
  return unknown;
}
