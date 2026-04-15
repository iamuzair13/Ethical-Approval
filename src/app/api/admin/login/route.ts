import { NextResponse } from "next/server";
import { buildAdminClaims, getAdminUserByEmail } from "@/lib/admin-repository";
import { verifyPassword } from "@/lib/password";

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(request: Request) {
  let body: LoginBody;
  try {
    body = (await request.json()) as LoginBody;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  const email = body.email?.trim();
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "Email and password are required." },
      { status: 400 },
    );
  }

  const admin = await getAdminUserByEmail(email);
  if (!admin || admin.status !== "active") {
    return NextResponse.json({ ok: false, error: "Invalid credentials." }, { status: 401 });
  }

  const valid = await verifyPassword(password, admin.passwordHash);
  if (!valid) {
    return NextResponse.json({ ok: false, error: "Invalid credentials." }, { status: 401 });
  }

  const claims = await buildAdminClaims(admin);
  return NextResponse.json({
    ok: true,
    admin: {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      status: admin.status,
    },
    claims,
    nextAuthProvider: "admin-credentials",
  });
}
