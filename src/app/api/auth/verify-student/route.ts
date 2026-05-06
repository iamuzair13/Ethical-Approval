import { verifyStudentByEmail } from "@/lib/sap-student";
import { NextResponse } from "next/server";
import { getActiveFacultyMemberByEmail } from "@/lib/faculty-members";

type VerifyRequestBody = {
  email?: string;
};

function isStudentEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith("@student.uol.edu.pk");
}

export async function POST(request: Request) {
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
    const faculty = await getActiveFacultyMemberByEmail(email);
    if (!faculty) {
      return NextResponse.json(
        { ok: false, errorCode: "FACULTY_NOT_FOUND" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      userType: "faculty",
      sapId: faculty.sapId,
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
