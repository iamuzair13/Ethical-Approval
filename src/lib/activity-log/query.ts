import { db } from "@/lib/db";
import type {
  ActivityEventDto,
  ActivityEventRow,
  ActivityEventsFilters,
  ActivityEventsQueryResult,
  ActivityEventsScope,
} from "./types";

type QueryParts = {
  where: string[];
  params: unknown[];
};

function buildFilters(
  filters: ActivityEventsFilters,
  scope: ActivityEventsScope,
): QueryParts {
  const parts: QueryParts = { where: ["1=1"], params: [] };

  if (scope.role !== "administrator") {
    parts.params.push(scope.adminId);
    const n = parts.params.length;
    parts.where.push(`(ae.actor_admin_id = $${n} OR ae.effective_admin_id = $${n})`);
  }

  const q = filters.q?.trim();
  if (q) {
    parts.params.push(`%${q}%`);
    const n = parts.params.length;
    parts.where.push(
      `(ae.description ILIKE $${n} OR ae.actor_name ILIKE $${n} OR ae.effective_name ILIKE $${n} OR ae.target_label ILIKE $${n} OR ae.action_code ILIKE $${n})`,
    );
  }

  if (filters.actorRole?.trim()) {
    parts.params.push(filters.actorRole.trim());
    parts.where.push(`ae.actor_role = $${parts.params.length}`);
  }

  if (filters.actorAdminId?.trim()) {
    parts.params.push(filters.actorAdminId.trim());
    parts.where.push(`ae.actor_admin_id = $${parts.params.length}`);
  }

  if (filters.actionCode?.trim()) {
    parts.params.push(filters.actionCode.trim());
    parts.where.push(`ae.action_code = $${parts.params.length}`);
  }

  if (filters.targetType?.trim()) {
    parts.params.push(filters.targetType.trim());
    parts.where.push(`ae.target_type = $${parts.params.length}`);
  }

  if (typeof filters.facultyId === "number" && Number.isInteger(filters.facultyId)) {
    parts.params.push(filters.facultyId);
    parts.where.push(`ae.faculty_id = $${parts.params.length}`);
  }

  if (filters.dateFrom?.trim()) {
    parts.params.push(filters.dateFrom.trim());
    parts.where.push(`ae.created_at >= $${parts.params.length}::timestamptz`);
  }

  if (filters.dateTo?.trim()) {
    parts.params.push(filters.dateTo.trim());
    parts.where.push(`ae.created_at < ($${parts.params.length}::date + INTERVAL '1 day')`);
  }

  if (filters.impersonation === "only") {
    parts.where.push("ae.impersonation_mode IS NOT NULL");
  } else if (filters.impersonation === "exclude") {
    parts.where.push("ae.impersonation_mode IS NULL");
  }

  return parts;
}

function formatEventRow(row: ActivityEventRow): ActivityEventDto {
  const created = new Date(row.created_at);
  const tz = row.actor_timezone?.trim() || "UTC";
  let createdAtFormatted: string;
  try {
    createdAtFormatted = created.toLocaleString("en-GB", {
      timeZone: tz === "UTC" ? "UTC" : tz,
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  } catch {
    createdAtFormatted = created.toISOString().replace("T", " ").slice(0, 19) + " UTC";
  }

  return {
    id: row.id,
    actionCode: row.action_code,
    description: row.description,
    targetType: row.target_type,
    targetId: row.target_id,
    targetLabel: row.target_label,
    actorName: row.actor_name,
    actorRole: row.actor_role,
    effectiveName: row.effective_name,
    effectiveRole: row.effective_role,
    impersonationMode: row.impersonation_mode,
    facultyName: row.faculty_name,
    submissionId: row.submission_id,
    metadata: row.metadata_json ?? {},
    createdAt: row.created_at,
    actorTimezone: row.actor_timezone,
    createdAtFormatted,
  };
}

export async function queryActivityEvents(
  filters: ActivityEventsFilters,
  scope: ActivityEventsScope,
): Promise<ActivityEventsQueryResult & { events: ActivityEventDto[] }> {
  const parts = buildFilters(filters, scope);
  const whereSql = parts.where.join(" AND ");

  const countResult = await db.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM activity_events ae WHERE ${whereSql}`,
    parts.params,
  );
  const total = Number.parseInt(countResult.rows[0]?.count ?? "0", 10);

  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
  const offset = (page - 1) * pageSize;
  const sortDir = filters.sort === "asc" ? "ASC" : "DESC";

  const listParams = [...parts.params, pageSize, offset];
  const result = await db.query<ActivityEventRow>(
    `
      SELECT
        ae.id,
        ae.action_code,
        ae.description,
        ae.target_type,
        ae.target_id,
        ae.target_label,
        ae.actor_admin_id,
        ae.actor_name,
        ae.actor_role,
        ae.effective_admin_id,
        ae.effective_name,
        ae.effective_role,
        ae.impersonation_mode,
        ae.faculty_id,
        ae.faculty_name,
        ae.submission_id,
        ae.metadata_json,
        ae.created_at::text,
        ae.actor_timezone
      FROM activity_events ae
      WHERE ${whereSql}
      ORDER BY ae.created_at ${sortDir}
      LIMIT $${listParams.length - 1}
      OFFSET $${listParams.length}
    `,
    listParams,
  );

  const rows = result.rows.map((row) => ({
    ...row,
    metadata_json:
      typeof row.metadata_json === "object" && row.metadata_json !== null
        ? (row.metadata_json as Record<string, unknown>)
        : {},
  }));

  return {
    rows,
    total,
    events: rows.map(formatEventRow),
  };
}

export async function queryActivityEventsForExport(
  filters: ActivityEventsFilters,
  scope: ActivityEventsScope,
): Promise<ActivityEventDto[]> {
  const parts = buildFilters(filters, scope);
  const whereSql = parts.where.join(" AND ");
  const sortDir = filters.sort === "asc" ? "ASC" : "DESC";

  const result = await db.query<ActivityEventRow>(
    `
      SELECT
        ae.id,
        ae.action_code,
        ae.description,
        ae.target_type,
        ae.target_id,
        ae.target_label,
        ae.actor_admin_id,
        ae.actor_name,
        ae.actor_role,
        ae.effective_admin_id,
        ae.effective_name,
        ae.effective_role,
        ae.impersonation_mode,
        ae.faculty_id,
        ae.faculty_name,
        ae.submission_id,
        ae.metadata_json,
        ae.created_at::text,
        ae.actor_timezone
      FROM activity_events ae
      WHERE ${whereSql}
      ORDER BY ae.created_at ${sortDir}
      LIMIT 10000
    `,
    parts.params,
  );

  return result.rows.map((row) =>
    formatEventRow({
      ...row,
      metadata_json:
        typeof row.metadata_json === "object" && row.metadata_json !== null
          ? (row.metadata_json as Record<string, unknown>)
          : {},
    }),
  );
}

export function parseActivityFiltersFromSearchParams(
  searchParams: URLSearchParams,
): ActivityEventsFilters {
  const facultyRaw = searchParams.get("facultyId");
  const facultyId = facultyRaw ? Number.parseInt(facultyRaw, 10) : undefined;

  const impersonation = searchParams.get("impersonation");
  const impersonationFilter =
    impersonation === "only" || impersonation === "exclude" ? impersonation : "all";

  return {
    q: searchParams.get("q") ?? undefined,
    page: Number.parseInt(searchParams.get("page") ?? "1", 10) || 1,
    pageSize: Number.parseInt(searchParams.get("pageSize") ?? "20", 10) || 20,
    sort: searchParams.get("sort") === "asc" ? "asc" : "desc",
    actorRole: searchParams.get("actorRole") ?? undefined,
    actorAdminId: searchParams.get("actorAdminId") ?? undefined,
    actionCode: searchParams.get("actionCode") ?? undefined,
    targetType: searchParams.get("targetType") ?? undefined,
    facultyId: Number.isInteger(facultyId) ? facultyId : undefined,
    dateFrom: searchParams.get("dateFrom") ?? undefined,
    dateTo: searchParams.get("dateTo") ?? undefined,
    impersonation: impersonationFilter === "all" ? undefined : impersonationFilter,
  };
}
