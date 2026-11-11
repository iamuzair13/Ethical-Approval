import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin } from "@/lib/admin-auth";
import {
  getDashboardSummary,
  type DashboardFilters,
  type TrackKey,
} from "@/lib/dashboard-summary";

const VALID_TRACKS: TrackKey[] = [
  "student_thesis",
  "student_publication",
  "faculty_publication",
];

function parseIsoDate(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : value;
}

function parseIntParam(value: string | null): number | undefined {
  if (!value) return undefined;
  const n = Number.parseInt(value, 10);
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

export async function GET(request: NextRequest) {
  const admin = await assertActiveAdmin(request);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);

  const from =
    parseIsoDate(params.get("from")) ?? defaultFrom.toISOString().slice(0, 10);
  const to = parseIsoDate(params.get("to")) ?? now.toISOString().slice(0, 10);

  const trackParam = params.get("track");
  const track = VALID_TRACKS.includes(trackParam as TrackKey)
    ? (trackParam as TrackKey)
    : undefined;

  const filters: DashboardFilters = {
    from,
    to,
    facultyId: parseIntParam(params.get("facultyId")),
    departmentId: parseIntParam(params.get("departmentId")),
    programId: parseIntParam(params.get("programId")),
    track,
  };

  const summary = await getDashboardSummary(admin, filters);
  return NextResponse.json({ ok: true, summary });
}
