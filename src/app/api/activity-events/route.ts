import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin, getActingAdminFromRequest } from "@/lib/admin-auth";
import {
  ACTIVITY_EVENTS_SETUP_MESSAGE,
  isMissingRelationError,
  parseActivityFiltersFromSearchParams,
  queryActivityEvents,
} from "@/lib/activity-log";

export async function GET(request: NextRequest) {
  const effective = await assertActiveAdmin(request);
  if (!effective) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const acting = await getActingAdminFromRequest(request);
  const scopeAdminId = acting?.adminId ?? effective.adminId;
  const scopeRole = acting?.role ?? effective.role;

  const url = new URL(request.url);
  const filters = parseActivityFiltersFromSearchParams(url.searchParams);

  try {
    const { events, total } = await queryActivityEvents(filters, {
      role: scopeRole,
      adminId: scopeAdminId,
    });

    return NextResponse.json({
      ok: true,
      events,
      total,
      page: filters.page ?? 1,
      pageSize: filters.pageSize ?? 20,
    });
  } catch (error) {
    if (isMissingRelationError(error, "activity_events")) {
      return NextResponse.json({
        ok: true,
        events: [],
        total: 0,
        page: filters.page ?? 1,
        pageSize: filters.pageSize ?? 20,
        setupRequired: true,
        setupMessage: ACTIVITY_EVENTS_SETUP_MESSAGE,
      });
    }
    console.error("[activity-events] list failed:", error);
    return NextResponse.json(
      { ok: false, error: "Unable to load activity events." },
      { status: 500 },
    );
  }
}
