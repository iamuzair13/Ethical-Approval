import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin } from "@/lib/admin-auth";
import { canAccessFacultySnapshot } from "@/lib/authorization";
import { resolveAttachmentForExtraIndex, resolveAttachmentForSlot } from "@/lib/submission-attachment-resolve";
import { createAttachmentReadStream, statAttachmentFile } from "@/lib/submission-file-storage";
import { db } from "@/lib/db";

function guessContentType(fileName: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".docx")) {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (lower.endsWith(".doc")) return "application/msword";
  return "application/octet-stream";
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const admin = await assertActiveAdmin(request);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await context.params;
  const submissionId = Number(id);
  if (!Number.isInteger(submissionId)) {
    return NextResponse.json({ ok: false, error: "Invalid submission id." }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const slot = searchParams.get("slot");
  const extraRaw = searchParams.get("extra");

  const row = await db.query<{ ethics_json: unknown; applicant_faculty: string }>(
    `
      SELECT sep.ethics_json, sas.faculty AS applicant_faculty
      FROM submissions s
      INNER JOIN submission_applicant_snapshot sas ON sas.submission_id = s.id
      LEFT JOIN submission_ethics_payload sep ON sep.submission_id = s.id
      WHERE s.id = $1
      LIMIT 1
    `,
    [submissionId],
  );

  const rec = row.rows[0];
  if (!rec) {
    return NextResponse.json({ ok: false, error: "Submission not found." }, { status: 404 });
  }

  if (!(await canAccessFacultySnapshot(admin, rec.applicant_faculty))) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const ethics =
    rec.ethics_json && typeof rec.ethics_json === "object" && !Array.isArray(rec.ethics_json)
      ? (rec.ethics_json as Record<string, unknown>)
      : null;

  let resolved;
  if (slot != null && slot.trim()) {
    resolved = resolveAttachmentForSlot(ethics, slot);
  } else if (extraRaw != null && extraRaw.trim() !== "") {
    const extra = Number.parseInt(extraRaw, 10);
    resolved = resolveAttachmentForExtraIndex(ethics, extra);
  } else {
    return NextResponse.json(
      { ok: false, error: "Missing slot or extra query parameter." },
      { status: 400 },
    );
  }

  if (!resolved.ok) {
    if (resolved.reason === "name_only") {
      return NextResponse.json(
        { ok: false, error: "File was not stored for this submission (name only)." },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: false, error: "Attachment not found." }, { status: 404 });
  }

  try {
    await statAttachmentFile(resolved.absolutePath);
  } catch {
    return NextResponse.json({ ok: false, error: "File missing on server." }, { status: 404 });
  }

  const stream = createAttachmentReadStream(resolved.absolutePath);
  const safeName = resolved.downloadName.replace(/[\r\n"]/g, "_");

  return new NextResponse(stream as unknown as BodyInit, {
    headers: {
      "Content-Type": guessContentType(resolved.downloadName),
      "Content-Disposition": `inline; filename="${safeName}"`,
    },
  });
}
