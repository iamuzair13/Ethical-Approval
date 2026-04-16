import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin, isAdministrator } from "@/lib/admin-auth";
import { createFaculty, listFaculties } from "@/lib/admin-repository";

export async function GET(request: NextRequest) {
  const actor = await assertActiveAdmin(request);
  if (!actor || !isAdministrator(actor)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const includeInactive = request.nextUrl.searchParams.get("all") === "1";
  const faculties = await listFaculties({ includeInactive });
  return NextResponse.json({ ok: true, faculties });
}

type CreateFacultyBody = {
  code?: string;
  name?: string;
};

export async function POST(request: NextRequest) {
  const actor = await assertActiveAdmin(request);
  if (!actor || !isAdministrator(actor)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  let body: CreateFacultyBody;
  try {
    body = (await request.json()) as CreateFacultyBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  if (!body.code?.trim() || !body.name?.trim()) {
    return NextResponse.json(
      { ok: false, error: "code and name are required." },
      { status: 400 },
    );
  }

  try {
    const faculty = await createFaculty({ code: body.code, name: body.name });
    return NextResponse.json({ ok: true, faculty });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to create faculty. Code may already exist." },
      { status: 409 },
    );
  }
}
