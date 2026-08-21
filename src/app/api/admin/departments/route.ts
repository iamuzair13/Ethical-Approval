import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin, isAdministrator } from "@/lib/admin-auth";
import { createDepartment, listDepartments } from "@/lib/admin-repository";
import { logActivityFromRequest } from "@/lib/activity-log";
import { getToken } from "next-auth/jwt";
import { getAuthSecret } from "@/lib/auth-secret";

// This route reads cookies (auth) and must never be cached/prerendered.
// Without this, Next.js production builds may serve a stale 403 response.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  // Debug: log what auth state we see on production
  const cookieNames = request.cookies.getAll().map((c) => c.name);
  console.log("[departments:GET] cookies:", cookieNames, "count:", request.cookies.size);
  const token = await getToken({ req: request, secret: getAuthSecret() });
  console.log("[departments:GET] token exists:", !!token, "adminId:", token?.adminId, "adminRole:", token?.adminRole);

  const actor = await assertActiveAdmin(request);
  console.log("[departments:GET] actor:", actor ? { id: actor.adminId, role: actor.role, status: actor.status } : null);

  if (!actor || !isAdministrator(actor)) {
    console.log("[departments:GET] FORBIDDEN — actor:", !!actor, "isAdministrator:", actor ? isAdministrator(actor) : false);
    return NextResponse.json(
      { ok: false, error: "Forbidden." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  const includeInactive = request.nextUrl.searchParams.get("all") === "1";
  const facultyIdRaw = request.nextUrl.searchParams.get("facultyId");
  const facultyId = facultyIdRaw && /^\d+$/.test(facultyIdRaw) ? Number(facultyIdRaw) : undefined;

  const departments = await listDepartments({ includeInactive, facultyId });
  return NextResponse.json(
    { ok: true, departments },
    { headers: { "Cache-Control": "no-store" } },
  );
}

type CreateDepartmentBody = {
  facultyId?: number | null;
  name?: string;
};

export async function POST(request: NextRequest) {
  const actor = await assertActiveAdmin(request);
  if (!actor || !isAdministrator(actor)) {
    return NextResponse.json(
      { ok: false, error: "Forbidden." },
      { status: 403, headers: { "Cache-Control": "no-store" } },
    );
  }

  let body: CreateDepartmentBody;
  try {
    body = (await request.json()) as CreateDepartmentBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return NextResponse.json(
      { ok: false, error: "name is required." },
      { status: 400 },
    );
  }

  try {
    const department = await createDepartment({
      facultyId: body.facultyId ?? null,
      name: body.name,
    });
    void logActivityFromRequest(request, {
      actionCode: "admin.department.create",
      targetType: "department",
      targetId: String(department.id),
      targetLabel: department.name,
      facultyId: body.facultyId ?? undefined,
    });
    return NextResponse.json({ ok: true, department });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Unable to create department. It may already exist." },
      { status: 409 },
    );
  }
}
