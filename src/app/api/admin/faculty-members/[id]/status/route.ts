import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin, isAdministrator } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { logActivityFromRequest } from "@/lib/activity-log";

/**
 * PATCH /api/admin/faculty-members/[id]/status
 * Toggles the account status (active/inactive) for both the faculty member
 * and their linked admin_users record.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const actor = await assertActiveAdmin(request);
  if (!actor || !isAdministrator(actor)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const { id: rawId } = await params;
  const id = rawId?.trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing faculty member ID." }, { status: 400 });
  }

  let body: { status?: string };
  try {
    body = (await request.json()) as { status?: string };
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const newStatus = body.status;
  if (newStatus !== "active" && newStatus !== "inactive") {
    return NextResponse.json(
      { ok: false, error: "status must be 'active' or 'inactive'." },
      { status: 400 },
    );
  }

  try {
    const currentResult = await db.query<{
      id: string;
      name: string;
      user_id: string | null;
      user_role: string | null;
    }>(
      `SELECT fm.id, fm.name, au.id AS user_id, au.role AS user_role
       FROM faculty_members fm
       LEFT JOIN admin_users au ON au.id = fm.user_id AND au.deleted_at IS NULL
       WHERE fm.id = $1 AND fm.deleted_at IS NULL
       LIMIT 1`,
      [id],
    );

    if (!currentResult.rows[0]) {
      return NextResponse.json({ ok: false, error: "Faculty member not found." }, { status: 404 });
    }

    const current = currentResult.rows[0];

    // Update faculty_members status
    await db.query(
      `UPDATE faculty_members SET status = $2, is_active = $3, updated_at = NOW() WHERE id = $1`,
      [id, newStatus, newStatus === "active"],
    );

    // Update admin_users status (if linked)
    if (current.user_id) {
      await db.query(
        `UPDATE admin_users SET status = $2, updated_at = NOW(), token_version = token_version + 1 WHERE id = $1`,
        [current.user_id, newStatus],
      );
    }

    // Only log if there's a linked admin_users record (FK constraint)
    if (current.user_id) {
      void logActivityFromRequest(request, {
        actionCode: newStatus === "active" ? "admin.user.activate" : "admin.user.deactivate",
        targetType: current.user_role === "supervisor" ? "supervisor" : current.user_role === "ireb" ? "ireb_member" : "administrator",
        targetId: current.user_id,
        targetLabel: current.name,
        effective: {
          adminId: current.user_id,
          name: current.name,
          role: (current.user_role ?? "faculty") as "administrator" | "supervisor" | "ireb" | "faculty",
        },
      });
    }

    return NextResponse.json({
      ok: true,
      status: newStatus,
    });
  } catch (error) {
    console.error("[faculty-members] status update failed:", error);
    return NextResponse.json(
      { ok: false, error: "Unable to update status." },
      { status: 500 },
    );
  }
}
