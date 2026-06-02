import { db } from "@/lib/db";
import { isMissingRelationError } from "./db-errors";
import type { ActivityEventDto, ActivityEventRow, ActivityEventsScope } from "./types";

const DEFAULT_LAST_READ = "1970-01-01T00:00:00.000Z";

function scopeWhereClause(scope: ActivityEventsScope, paramOffset: number): {
  sql: string;
  params: unknown[];
} {
  if (scope.role === "administrator") {
    return { sql: "1=1", params: [] };
  }
  return {
    sql: `(ae.actor_admin_id = $${paramOffset} OR ae.effective_admin_id = $${paramOffset})`,
    params: [scope.adminId],
  };
}

async function getLastReadAt(adminUserId: string): Promise<Date> {
  try {
    const result = await db.query<{ last_read_at: string }>(
      `SELECT last_read_at::text FROM activity_notification_reads WHERE admin_user_id = $1`,
      [adminUserId],
    );
    const raw = result.rows[0]?.last_read_at;
    if (!raw) return new Date(DEFAULT_LAST_READ);
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? new Date(DEFAULT_LAST_READ) : d;
  } catch (error) {
    if (isMissingRelationError(error, "activity_notification_reads")) {
      return new Date(DEFAULT_LAST_READ);
    }
    throw error;
  }
}

function mapRow(row: ActivityEventRow): ActivityEventDto {
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

export async function countUnreadActivityNotifications(
  scope: ActivityEventsScope,
): Promise<number> {
  try {
    const lastRead = await getLastReadAt(scope.adminId);
    const scopePart = scopeWhereClause(scope, 2);
    const params: unknown[] = [lastRead.toISOString(), ...scopePart.params];

    const result = await db.query<{ count: string }>(
      `
        SELECT COUNT(*)::text AS count
        FROM activity_events ae
        WHERE ae.created_at > $1::timestamptz
          AND ${scopePart.sql}
      `,
      params,
    );
    return Number.parseInt(result.rows[0]?.count ?? "0", 10);
  } catch (error) {
    if (isMissingRelationError(error, "activity_events")) return 0;
    throw error;
  }
}

export async function listRecentActivityNotifications(
  scope: ActivityEventsScope,
  limit = 15,
): Promise<ActivityEventDto[]> {
  try {
    const scopePart = scopeWhereClause(scope, 1);
    const params = [...scopePart.params, limit];

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
        WHERE ${scopePart.sql}
        ORDER BY ae.created_at DESC
        LIMIT $${params.length}
      `,
      params,
    );

    return result.rows.map((row) =>
      mapRow({
        ...row,
        metadata_json:
          typeof row.metadata_json === "object" && row.metadata_json !== null
            ? (row.metadata_json as Record<string, unknown>)
            : {},
      }),
    );
  } catch (error) {
    if (isMissingRelationError(error, "activity_events")) return [];
    throw error;
  }
}

export async function markActivityNotificationsRead(adminUserId: string): Promise<void> {
  try {
    await db.query(
      `
        INSERT INTO activity_notification_reads (admin_user_id, last_read_at, updated_at)
        VALUES ($1, NOW(), NOW())
        ON CONFLICT (admin_user_id) DO UPDATE SET
          last_read_at = NOW(),
          updated_at = NOW()
      `,
      [adminUserId],
    );
  } catch (error) {
    if (isMissingRelationError(error, "activity_notification_reads")) return;
    throw error;
  }
}
