import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin, getActingAdminFromRequest } from "@/lib/admin-auth";
import {
  activityEventsToCsv,
  activityEventsToXlsxBuffer,
} from "@/lib/activity-events-export";
import {
  ACTIVITY_EVENTS_SETUP_MESSAGE,
  isMissingRelationError,
  parseActivityFiltersFromSearchParams,
  queryActivityEventsForExport,
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
  const format = (url.searchParams.get("format") ?? "csv").toLowerCase();
  if (format !== "csv" && format !== "xlsx") {
    return NextResponse.json(
      { ok: false, error: "format must be csv or xlsx." },
      { status: 400 },
    );
  }

  const filters = parseActivityFiltersFromSearchParams(url.searchParams);

  try {
    const events = await queryActivityEventsForExport(filters, {
      role: scopeRole,
      adminId: scopeAdminId,
    });

    const stamp = new Date().toISOString().slice(0, 10);

    if (format === "xlsx") {
      const buffer = activityEventsToXlsxBuffer(events);
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="activity-events-${stamp}.xlsx"`,
        },
      });
    }

    const csv = activityEventsToCsv(events);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="activity-events-${stamp}.csv"`,
      },
    });
  } catch (error) {
    if (isMissingRelationError(error, "activity_events")) {
      return NextResponse.json(
        { ok: false, error: ACTIVITY_EVENTS_SETUP_MESSAGE },
        { status: 503 },
      );
    }
    console.error("[activity-events] export failed:", error);
    return NextResponse.json(
      { ok: false, error: "Unable to export activity events." },
      { status: 500 },
    );
  }
}
