import { verifyStudentByEmail } from "@/lib/sap-student";
import { NextResponse } from "next/server";

type VerifyRequestBody = {
  email?: string;
};

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

  const result = await verifyStudentByEmail(body.email ?? "");
  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    sapId: result.sapId,
  });
}
