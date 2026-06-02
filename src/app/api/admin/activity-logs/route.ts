import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin, getActingAdminFromRequest } from "@/lib/admin-auth";
import {
  parseActivityFiltersFromSearchParams,
  queryActivityEvents,
} from "@/lib/activity-log";

/**
 * @deprecated Use GET /api/activity-events instead.
 * Returns a subset of fields for legacy clients.
 */
export async function GET(request: NextRequest) {
  const effective = await assertActiveAdmin(request);
  if (!effective) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (effective.role !== "administrator") {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const acting = await getActingAdminFromRequest(request);
  const url = new URL(request.url);
  const filters = parseActivityFiltersFromSearchParams(url.searchParams);
  filters.pageSize = 500;
  filters.page = 1;

  try {
    const { events } = await queryActivityEvents(filters, {
      role: acting?.role ?? "administrator",
      adminId: acting?.adminId ?? effective.adminId,
    });

    const logs = events
      .filter((e) => e.targetType === "application")
      .map((e) => ({
        id: e.id,
        submission_id: e.submissionId ?? 0,
        application_id: e.targetLabel ?? e.targetId ?? "",
        applicant_name: e.metadata?.applicantName ?? "",
        stage: (e.metadata?.stage as string) === "ireb" ? "ireb" : "dean",
        decision: e.actionCode.includes("approve") ? "approved" : "rejected",
        comment: e.description,
        decided_by_name: e.actorName,
        decided_at: e.createdAt,
      }));

    return NextResponse.json({ ok: true, logs });
  } catch (error) {
    console.error("[activity-logs] deprecated route failed:", error);
    return NextResponse.json(
      { ok: false, error: "Unable to load activity logs." },
      { status: 500 },
    );
  }
}
