import { db } from "@/lib/db";

export type SubmissionDetail = {
  id: number;
  application_id: string;
  type: "thesis" | "publication";
  domain: "medical" | "non_medical";
  current_status:
    | "submitted"
    | "under_supervisor_review"
    | "supervisor_approved"
    | "supervisor_rejected"
    | "under_ireb_review"
    | "approved"
    | "rejected";
  submitted_at: Date;
  title: string | null;
  objectives: string | null;
  methodology: string | null;
  participants_range: string | null;
  research_population: string | null;
  applicant_name: string;
  applicant_email: string;
  applicant_faculty: string;
  applicant_department: string;
  applicant_program: string | null;
  applicant_sap_id: string;
  ethics_json: unknown;

  /** Position of this submission among the applicant's non-draft submissions (1-based). */
  applicant_attempt_number: number;
  /** Total non-draft submissions made by this applicant (including this one). */
  applicant_total_submissions: number;
  /** Most recent supervisor decision timestamp on this submission, if any. */
  supervisor_decision_at: Date | null;
  /** Most recent IREB decision timestamp on this submission, if any. */
  ireb_decision_at: Date | null;
  /** Count of files uploaded by the applicant at submission stage. */
  submission_attachment_count: number;
  /** Thesis timeline (null for publications and for submissions without a stored timeline). */
  start_date: Date | null;
  end_date: Date | null;
};

export async function getSubmissionDetailById(submissionId: number) {
  const result = await db.query<SubmissionDetail>(
    `
      SELECT
        s.id,
        s.application_id,
        s.type,
        s.domain,
        s.current_status,
        s.submitted_at,
        src.title,
        src.objectives,
        src.methodology,
        src.participants_range,
        src.research_population,
        sas.name AS applicant_name,
        sas.email AS applicant_email,
        sas.faculty AS applicant_faculty,
        sas.department AS applicant_department,
        sas.program AS applicant_program,
        sas.sap_id AS applicant_sap_id,
        sep.ethics_json,
        st.start_date,
        st.end_date,
        (
          SELECT COUNT(*)::int
          FROM submissions s2
          INNER JOIN submission_applicant_snapshot sas2
            ON sas2.submission_id = s2.id
          WHERE sas2.sap_id = sas.sap_id
            AND s2.current_status <> 'draft'
        ) AS applicant_total_submissions,
        (
          SELECT COUNT(*)::int
          FROM submissions s2
          INNER JOIN submission_applicant_snapshot sas2
            ON sas2.submission_id = s2.id
          WHERE sas2.sap_id = sas.sap_id
            AND s2.current_status <> 'draft'
            AND s2.submitted_at <= s.submitted_at
        ) AS applicant_attempt_number,
        (
          SELECT MAX(ad.decided_at)
          FROM approval_decisions ad
          WHERE ad.submission_id = s.id
            AND ad.stage = 'supervisor'
        ) AS supervisor_decision_at,
        (
          SELECT MAX(ad.decided_at)
          FROM approval_decisions ad
          WHERE ad.submission_id = s.id
            AND ad.stage = 'ireb'
        ) AS ireb_decision_at,
        (
          SELECT COUNT(*)::int
          FROM submission_attachments sa
          WHERE sa.submission_id = s.id
            AND sa.upload_stage = 'submission'
        ) AS submission_attachment_count
      FROM submissions s
      INNER JOIN submission_applicant_snapshot sas ON sas.submission_id = s.id
      LEFT JOIN submission_research_core src ON src.submission_id = s.id
      LEFT JOIN submission_ethics_payload sep ON sep.submission_id = s.id
      LEFT JOIN submission_timeline st ON st.submission_id = s.id
      WHERE s.id = $1
      LIMIT 1
    `,
    [submissionId],
  );

  return result.rows[0] ?? null;
}
