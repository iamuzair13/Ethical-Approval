import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin, getActingAdminFromRequest } from "@/lib/admin-auth";
import {
  ACTIVITY_EVENTS_SETUP_MESSAGE,
  countUnreadActivityNotifications,
  isMissingRelationError,
  listRecentActivityNotifications,
  markActivityNotificationsRead,
} from "@/lib/activity-log";

export async function GET(request: NextRequest) {
  const effective = await assertActiveAdmin(request);
  if (!effective) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const acting = await getActingAdminFromRequest(request);
  const scopeAdminId = acting?.adminId ?? effective.adminId;
  const scopeRole = acting?.role ?? effective.role;
  const scope = { role: scopeRole, adminId: scopeAdminId };

  const url = new URL(request.url);
  const limit = Math.min(
    30,
    Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? "15", 10) || 15),
  );

  try {
    const [unreadCount, notifications] = await Promise.all([
      countUnreadActivityNotifications(scope),
      listRecentActivityNotifications(scope, limit),
    ]);

    return NextResponse.json({
      ok: true,
      unreadCount,
      notifications,
    });
  } catch (error) {
    if (isMissingRelationError(error, "activity_events")) {
      return NextResponse.json({
        ok: true,
        unreadCount: 0,
        notifications: [],
        setupRequired: true,
        setupMessage: ACTIVITY_EVENTS_SETUP_MESSAGE,
      });
    }
    console.error("[activity-events/notifications] GET failed:", error);
    return NextResponse.json(
      { ok: false, error: "Unable to load notifications." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const effective = await assertActiveAdmin(request);
  if (!effective) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const acting = await getActingAdminFromRequest(request);
  const scopeAdminId = acting?.adminId ?? effective.adminId;

  try {
    await markActivityNotificationsRead(scopeAdminId);
    return NextResponse.json({ ok: true, unreadCount: 0 });
  } catch (error) {
    if (isMissingRelationError(error, "activity_notification_reads")) {
      return NextResponse.json({ ok: true, unreadCount: 0 });
    }
    console.error("[activity-events/notifications] POST failed:", error);
    return NextResponse.json(
      { ok: false, error: "Unable to mark notifications as read." },
      { status: 500 },
    );
  }
}
