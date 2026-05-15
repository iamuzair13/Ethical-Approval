import type { ReportSubmissionRow } from "@/lib/admin-report-queries";
import { resolveFacultyIdsFromSnapshotValue } from "@/lib/admin-repository";
import { db } from "@/lib/db";

type DeptRow = { id: number; faculty_id: number; name: string };

/** BIGINT columns from node-pg are often strings; normalize for comparisons. */
export function intIdEq(a: unknown, b: unknown): boolean {
  const na = Number(a);
  const nb = Number(b);
  return Number.isFinite(na) && Number.isFinite(nb) && na === nb;
}

function normDeptName(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

async function facultyIdsForSnapshotCached(
  snapshotFaculty: string,
  cache: Map<string, number[]>,
): Promise<number[]> {
  const key = snapshotFaculty;
  if (cache.has(key)) return cache.get(key)!;
  const ids = await resolveFacultyIdsFromSnapshotValue(snapshotFaculty);
  cache.set(key, ids);
  return ids;
}

export async function filterReportRowsByMasterFacultyId(
  rows: ReportSubmissionRow[],
  facultyId: number,
): Promise<ReportSubmissionRow[]> {
  const cache = new Map<string, number[]>();
  const out: ReportSubmissionRow[] = [];
  for (const r of rows) {
    const ids = await facultyIdsForSnapshotCached(r.faculty, cache);
    if (ids.some((id) => intIdEq(id, facultyId))) out.push(r);
  }
  return out;
}

export async function getDepartmentRow(departmentId: number): Promise<DeptRow | null> {
  const res = await db.query<DeptRow>(
    `
      SELECT d.id, d.faculty_id, d.name
      FROM departments d
      WHERE d.id = $1
      LIMIT 1
    `,
    [departmentId],
  );
  return res.rows[0] ?? null;
}

export async function filterReportRowsByDepartmentId(
  rows: ReportSubmissionRow[],
  department: DeptRow,
): Promise<ReportSubmissionRow[]> {
  const targetDept = normDeptName(department.name);
  const cache = new Map<string, number[]>();
  const out: ReportSubmissionRow[] = [];
  for (const r of rows) {
    const ids = await facultyIdsForSnapshotCached(r.faculty, cache);
    if (!ids.some((id) => intIdEq(id, department.faculty_id))) continue;
    if (normDeptName(r.applicant_department) !== targetDept) continue;
    out.push(r);
  }
  return out;
}

export function departmentCountsForFacultyReport(
  rows: ReportSubmissionRow[],
): Map<string, number> {
  const m = new Map<string, number>();
  for (const r of rows) {
    const d = r.applicant_department.replace(/\s+/g, " ").trim() || "—";
    m.set(d, (m.get(d) ?? 0) + 1);
  }
  return m;
}

export function extremalDepartmentByVolume(
  byDept: Map<string, number>,
  pick: "max" | "min",
): { name: string; count: number } | null {
  let best: { name: string; count: number } | null = null;
  for (const [name, count] of byDept) {
    if (name === "—" && byDept.size > 1) continue;
    if (!best) {
      best = { name, count };
      continue;
    }
    if (pick === "max") {
      if (count > best.count || (count === best.count && name.localeCompare(best.name) < 0)) {
        best = { name, count };
      }
    } else if (count < best.count || (count === best.count && name.localeCompare(best.name) < 0)) {
      best = { name, count };
    }
  }
  return best;
}
