import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { listFaculties } from "@/lib/admin-repository";
import {
  ACTIVITY_EVENTS_SETUP_MESSAGE,
  isMissingRelationError,
} from "@/lib/activity-log/db-errors";

const DEFAULT_TARGET_TYPES = [
  "application",
  "supervisor",
  "ireb_member",
  "administrator",
  "faculty",
  "department",
  "settings",
  "report",
  "profile",
  "system",
];

const DEFAULT_ACTOR_ROLES = ["administrator", "supervisor", "ireb"];

export async function GET(request: NextRequest) {
  const admin = await assertActiveAdmin(request);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  let actionCodes: string[] = [];
  let actors: { id: string; name: string; role: string }[] = [];
  let setupRequired = false;

  try {
    const actionCodesResult = await db.query<{ action_code: string }>(
      `SELECT DISTINCT action_code FROM activity_events ORDER BY action_code`,
    );
    actionCodes = actionCodesResult.rows.map((r) => r.action_code);

    const actorsResult = await db.query<{ id: string; name: string; role: string }>(
      `
        SELECT DISTINCT au.id, au.name, au.role::text AS role
        FROM activity_events ae
        INNER JOIN admin_users au ON au.id = ae.actor_admin_id
        ORDER BY au.name
        LIMIT 200
      `,
    );
    actors = actorsResult.rows.map((r) => ({
      id: r.id,
      name: r.name,
      role: r.role,
    }));
  } catch (error) {
    if (isMissingRelationError(error, "activity_events")) {
      setupRequired = true;
    } else if (isMissingRelationError(error, "admin_users")) {
      setupRequired = true;
    } else {
      throw error;
    }
  }

  let faculties: { id: number; name: string }[] = [];
  try {
    const facultyRows = await listFaculties({ includeInactive: true });
    faculties = facultyRows.map((f) => ({ id: f.id, name: f.name }));
  } catch {
    faculties = [];
  }

  return NextResponse.json({
    ok: true,
    actionCodes,
    actors,
    faculties,
    targetTypes: DEFAULT_TARGET_TYPES,
    actorRoles: DEFAULT_ACTOR_ROLES,
    setupRequired,
    setupMessage: setupRequired ? ACTIVITY_EVENTS_SETUP_MESSAGE : undefined,
  });
}
