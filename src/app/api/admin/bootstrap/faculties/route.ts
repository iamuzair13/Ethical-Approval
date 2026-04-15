import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin, isAdministrator } from "@/lib/admin-auth";
import {
  DEFAULT_FACULTY_SEEDS,
  getUnknownSapFacultyValues,
  seedFaculties,
} from "@/lib/faculty-bootstrap";

type BootstrapBody = {
  faculties?: {
    code: string;
    name: string;
    sapAliases?: string[];
  }[];
  sapFacultyValues?: string[];
};

export async function POST(request: NextRequest) {
  const admin = await assertActiveAdmin(request);
  if (!admin || !isAdministrator(admin)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  let body: BootstrapBody = {};
  try {
    body = (await request.json()) as BootstrapBody;
  } catch {
    body = {};
  }

  const seeds =
    body.faculties?.map((faculty) => ({
      code: faculty.code,
      name: faculty.name,
      sapAliases: faculty.sapAliases ?? [],
    })) ?? DEFAULT_FACULTY_SEEDS;

  await seedFaculties(seeds);

  const unknownValues = Array.isArray(body.sapFacultyValues)
    ? await getUnknownSapFacultyValues(body.sapFacultyValues)
    : [];

  return NextResponse.json({
    ok: true,
    seededCount: seeds.length,
    unknownSapFacultyValues: unknownValues,
  });
}
