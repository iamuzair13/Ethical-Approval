import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin, isAdministrator } from "@/lib/admin-auth";
import { canAccessFacultySnapshot } from "@/lib/authorization";
import { db } from "@/lib/db";
import { resolveFacultyIdsFromSnapshotValue } from "@/lib/admin-repository";
import { getSubmissionDetailById } from "@/lib/submission-details";

type AdminOption = {
  id: string;
  name: string;
  role: "dean" | "ireb";
};

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const actor = await assertActiveAdmin(request);
  if (!actor) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (!isAdministrator(actor)) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const { id } = await context.params;
  const submissionId = Number(id);
  if (!Number.isInteger(submissionId)) {
    return NextResponse.json({ ok: false, error: "Invalid submission id." }, { status: 400 });
  }

  const submission = await getSubmissionDetailById(submissionId);
  if (!submission) {
    return NextResponse.json({ ok: false, error: "Submission not found." }, { status: 404 });
  }
  if (!(await canAccessFacultySnapshot(actor, submission.applicant_faculty))) {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const facultyIds = await resolveFacultyIdsFromSnapshotValue(submission.applicant_faculty);

  let deanOption: AdminOption | null = null;
  if (facultyIds.length > 0) {
    const deanResult = await db.query<AdminOption>(
      `
        SELECT au.id, au.name, au.role
        FROM admin_users au
        INNER JOIN admin_faculty_assignments afa ON afa.admin_user_id = au.id
        WHERE au.role = 'dean'
          AND au.status = 'active'
          AND au.deleted_at IS NULL
          AND afa.assignment_type = 'dean_primary'
          AND afa.deleted_at IS NULL
          AND afa.faculty_id = ANY($1::bigint[])
        ORDER BY au.updated_at DESC
        LIMIT 1
      `,
      [facultyIds],
    );
    deanOption = deanResult.rows[0] ?? null;
  }

  if (!deanOption) {
    const fallbackDeanResult = await db.query<AdminOption>(
      `
        SELECT au.id, au.name, au.role
        FROM admin_users au
        WHERE au.role = 'dean'
          AND au.status = 'active'
          AND au.deleted_at IS NULL
          AND au.faculty_id IS NOT NULL
          AND EXISTS (
            SELECT 1
            FROM admin_faculty_assignments afa
            WHERE afa.admin_user_id = au.id
              AND afa.assignment_type = 'dean_primary'
              AND afa.deleted_at IS NULL
          )
        ORDER BY au.updated_at DESC
        LIMIT 1
      `,
    );
    deanOption = fallbackDeanResult.rows[0] ?? null;
  }

  const irebResult = await db.query<AdminOption>(
    `
      SELECT id, name, role
      FROM admin_users
      WHERE role = 'ireb'
        AND status = 'active'
        AND deleted_at IS NULL
      ORDER BY name ASC
    `,
  );

  return NextResponse.json({
    ok: true,
    currentStatus: submission.current_status,
    deanOption,
    irebOptions: irebResult.rows,
  });
}
