/**
 * Returns true when the applicant email belongs to a student at UOL.
 * Only student emails go through the supervisor approval stage.
 * Non-student emails skip supervisor review and go directly to IREB.
 */
export function isStudentApplicantEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith("@student.uol.edu.pk");
}
