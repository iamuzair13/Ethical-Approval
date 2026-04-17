import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { getDashboardLeads, getOverviewData, getUsedDevicesData } from "@/app/(home)/fetch";
import { getScopedSubmissions } from "@/lib/authorization";
import { normalizeFacultyIds, type AuthenticatedAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { resolveFacultyIdsFromSnapshotValue } from "@/lib/admin-repository";

function toAdminScopeFromSession(
  session: Session | null,
): AuthenticatedAdmin | null {
  if (!session?.user?.adminId || !session.user.adminRole || !session.user.adminStatus) {
    return null;
  }

  return {
    adminId: session.user.adminId,
    role: session.user.adminRole,
    status: session.user.adminStatus,
    scopeMode: session.user.adminScopeMode ?? "all",
    facultyIds: normalizeFacultyIds(session.user.adminFacultyIds),
    tokenVersion: 0,
  };
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const includeScopeDebug = request.nextUrl.searchParams.get("debug") === "1";
  const [overviewData, usedDevicesData, leadsData] = await Promise.all([
    getOverviewData(session),
    getUsedDevicesData(session),
    getDashboardLeads(session),
  ]);

  if (!includeScopeDebug) {
    return NextResponse.json({
      ok: true,
      overviewData,
      usedDevicesData,
      leadsData,
    });
  }

  const adminScope = toAdminScopeFromSession(session);
  const scopedSubmissions = adminScope ? await getScopedSubmissions(adminScope) : [];
  const snapshotFaculties = await db.query<{ faculty: string }>(
    `
      SELECT DISTINCT sas.faculty
      FROM submission_applicant_snapshot sas
      ORDER BY sas.faculty ASC
    `,
  );
  const facultyResolution = await Promise.all(
    snapshotFaculties.rows.map(async ({ faculty }) => ({
      faculty,
      resolvedFacultyIds: await resolveFacultyIdsFromSnapshotValue(faculty),
    })),
  );

  return NextResponse.json({
    ok: true,
    overviewData,
    usedDevicesData,
    leadsData,
    debug: {
      role: session.user.adminRole ?? null,
      scopeMode: session.user.adminScopeMode ?? null,
      facultyIdsRaw: session.user.adminFacultyIds ?? null,
      facultyIdsNormalized: adminScope?.facultyIds ?? [],
      scopedSubmissionCount: scopedSubmissions.length,
      scopedSubmissionFaculties: Array.from(new Set(scopedSubmissions.map((row) => row.faculty))),
      facultyResolution,
    },
  });
}

