import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";

type FacultyRow = {
  name: string;
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\s+/g, " ")
    .trim();

const MEDICAL_FACULTIES = new Set([
  normalize("Faculty of Pharmacy"),
  normalize("Faculty of Allied Health Sciences"),
  normalize("Faculty of Allied Health Science"),
  normalize("Faculty of Medicine and Dentistry"),
  normalize("Faculty of Medicine & Dentistry"),
]);

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.sapId) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const facultyParam = request.nextUrl.searchParams.get("faculty")?.trim();
  if (!facultyParam) {
    return NextResponse.json({ ok: true, matchedFaculty: null, isMedicalResearchPublicationEligible: false });
  }

  const faculties = await db.query<FacultyRow>(
    `
      SELECT name
      FROM faculties
      WHERE is_active = TRUE
    `,
  );

  const normalizedProfileFaculty = normalize(facultyParam);
  const matched = faculties.rows.find((row) => normalize(row.name) === normalizedProfileFaculty);

  return NextResponse.json({
    ok: true,
    profileFaculty: facultyParam,
    matchedFaculty: matched?.name ?? null,
    isMedicalResearchPublicationEligible: matched
      ? MEDICAL_FACULTIES.has(normalize(matched.name))
      : false,
  });
}
