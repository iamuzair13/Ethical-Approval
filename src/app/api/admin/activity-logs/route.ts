import { NextRequest, NextResponse } from "next/server";
import { assertActiveAdmin } from "@/lib/admin-auth";
import { formatDecidedByName } from "@/lib/application-id";
import { db } from "@/lib/db";

type ActivityLogRow = {
  id: number;
  submission_id: number;
  application_id: string;
  applicant_name: string;
  stage: "dean" | "ireb";
  decision: "approved" | "rejected";
  comment: string | null;
  decided_by_name: string | null;
  decided_at: string;
  actor_name_from_trace: string | null;
  decider_name: string | null;
};

function normalizeActionTraceComment(
  comment: string | null,
  actorNameFromTrace: string | null,
): string | null {
  if (!comment) return null;
  const match = comment.match(
    /(?:Action performed by administrator\s+)+(.+?)\s+on behalf of\s+(.+?)\./,
  );
  if (!match) return comment;

  const actorRaw = match[1].trim();
  const onBehalfName = match[2].trim();
  const actorLooksLikeUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      actorRaw,
    );
  const resolvedActor = actorLooksLikeUuid && actorNameFromTrace?.trim()
    ? actorNameFromTrace.trim()
    : actorRaw;

  const normalizedTrace = `Action performed by administrator ${resolvedActor} on behalf of ${onBehalfName}.`;
  const traceChunk = match[0];
  const remaining = comment.replace(traceChunk, "").trim();
  return remaining ? `${remaining}\n\n${normalizedTrace}` : normalizedTrace;
}

export async function GET(request: NextRequest) {
  const admin = await assertActiveAdmin(request);
  if (!admin) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }
  if (admin.role !== "administrator") {
    return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
  }

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim();

  const result = await db.query<ActivityLogRow>(
    `
      SELECT
        ad.id,
        ad.submission_id,
        s.application_id,
        sas.name AS applicant_name,
        ad.stage,
        ad.decision,
        ad.comment,
        ad.decided_by_name,
        ad.decided_at::text,
        actor.name AS actor_name_from_trace,
        decider.name AS decider_name
      FROM approval_decisions ad
      INNER JOIN submissions s ON s.id = ad.submission_id
      INNER JOIN submission_applicant_snapshot sas ON sas.submission_id = s.id
      LEFT JOIN admin_users actor
        ON actor.id::text = (regexp_match(
          ad.comment,
          '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})'
        ))[1]
      LEFT JOIN admin_users decider
        ON decider.id::text = ad.decided_by_sap_id
        OR (
          decider.sap_id IS NOT NULL
          AND decider.sap_id = ad.decided_by_sap_id
        )
      WHERE (
        $1 = ''
        OR s.application_id ILIKE '%' || $1 || '%'
        OR sas.name ILIKE '%' || $1 || '%'
        OR COALESCE(ad.decided_by_name, '') ILIKE '%' || $1 || '%'
        OR COALESCE(ad.comment, '') ILIKE '%' || $1 || '%'
      )
      ORDER BY ad.decided_at DESC
      LIMIT 500
    `,
    [query],
  );

  const logs = result.rows.map(({ decider_name, actor_name_from_trace, ...row }) => ({
    ...row,
    decided_by_name: formatDecidedByName(row.decided_by_name, decider_name),
    comment: normalizeActionTraceComment(row.comment, actor_name_from_trace),
  }));

  return NextResponse.json({ ok: true, logs });
}
