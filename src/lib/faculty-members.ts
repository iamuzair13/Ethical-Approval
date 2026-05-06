import { db } from "@/lib/db";

export type FacultyMemberRecord = {
  id: string;
  sapId: string;
  name: string;
  email: string;
  department: string;
  designation: string | null;
  status: "active" | "inactive";
};

export async function getActiveFacultyMemberByEmail(
  email: string,
): Promise<FacultyMemberRecord | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const result = await db.query<FacultyMemberRecord>(
    `
      SELECT
        id,
        sap_id AS "sapId",
        name,
        email,
        department,
        designation,
        status
      FROM faculty_members
      WHERE lower(email) = $1
        AND status = 'active'
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [normalized],
  );

  return result.rows[0] ?? null;
}
