import { db } from "@/lib/db";

export type SubmissionDetail = {
  id: number;
  type: "thesis" | "publication";
  domain: "medical" | "non_medical";
  current_status:
    | "submitted"
    | "under_dean_review"
    | "dean_approved"
    | "dean_rejected"
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
};

export async function getSubmissionDetailById(submissionId: number) {
  const result = await db.query<SubmissionDetail>(
    `
      SELECT
        s.id,
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
        sep.ethics_json
      FROM submissions s
      INNER JOIN submission_applicant_snapshot sas ON sas.submission_id = s.id
      LEFT JOIN submission_research_core src ON src.submission_id = s.id
      LEFT JOIN submission_ethics_payload sep ON sep.submission_id = s.id
      WHERE s.id = $1
      LIMIT 1
    `,
    [submissionId],
  );

  return result.rows[0] ?? null;
}
