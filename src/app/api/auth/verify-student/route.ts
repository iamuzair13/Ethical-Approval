import { verifyEmployeeByEmail } from "@/lib/sap-employee";
import { verifyStudentByEmail } from "@/lib/sap-student";
import { getAdminUserByEmail } from "@/lib/admin-repository";
import { getFacultyMemberByEmail } from "@/lib/faculty-members";
import { NextResponse } from "next/server";

type VerifyRequestBody = {
  email?: string;
};

function isStudentEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith("@student.uol.edu.pk");
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const adminOnly = url.searchParams.get("admin") === "1";

  let body: VerifyRequestBody;
  try {
    body = (await request.json()) as VerifyRequestBody;
  } catch {
    return NextResponse.json(
      { ok: false, errorCode: "INVALID_EMAIL" },
      { status: 400 },
    );
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!email) {
    return NextResponse.json(
      { ok: false, errorCode: "INVALID_EMAIL" },
      { status: 400 },
    );
  }

  if (!isStudentEmail(email)) {
    // Check the unified admin_users table first. Every faculty member and
    // admin has a record here (created by sync or migration).
    const user = await getAdminUserByEmail(email);
    if (user) {
      if (user.status !== "active") {
        return NextResponse.json(
          { ok: false, errorCode: "FACULTY_INACTIVE" },
          { status: 400 },
        );
      }
      // Admin login requires an actual admin role — not just a DB record.
      if (adminOnly && !user.role) {
        return NextResponse.json(
          { ok: false, errorCode: "ADMIN_ROLE_REQUIRED" },
          { status: 403 },
        );
      }
      // Return the SAP ID from the user record or linked faculty profile
      const faculty = await getFacultyMemberByEmail(email, {
        includeInactive: true,
      });
      return NextResponse.json({
        ok: true,
        userType: "faculty",
        sapId: user.sapId ?? faculty?.sapId,
      });
    }

    // Admin login must only verify against the DB — never fall back to SAP.
    if (adminOnly) {
      return NextResponse.json(
        { ok: false, errorCode: "FACULTY_NOT_FOUND" },
        { status: 400 },
      );
    }

    // Not in admin_users — check faculty_members directly. Synced faculty
    // may exist here without an admin_users record yet.
    const facultyOnly = await getFacultyMemberByEmail(email, {
      includeInactive: true,
    });
    if (facultyOnly) {
      if (facultyOnly.status !== "active") {
        return NextResponse.json(
          { ok: false, errorCode: "FACULTY_INACTIVE" },
          { status: 400 },
        );
      }
      return NextResponse.json({
        ok: true,
        userType: "faculty",
        sapId: facultyOnly.sapId,
      });
    }

    // Not found in admin_users or faculty_members — fall back to SAP
    // empinfoSet verification. This handles new faculty who haven't been
    // synced yet.
    const empResult = await verifyEmployeeByEmail(email);
    if (!empResult.ok) {
      const errorCode =
        empResult.errorCode === "NOT_FOUND"
          ? "FACULTY_NOT_FOUND"
          : empResult.errorCode;
      return NextResponse.json({ ok: false, errorCode }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      userType: "faculty",
      sapId: empResult.sapId,
    });
  }

  const result = await verifyStudentByEmail(email);
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    userType: "student",
    sapId: result.sapId,
  });
}
