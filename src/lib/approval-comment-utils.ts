/**
 * Strips the administrator audit suffix appended to decision comments when acting on behalf of another admin.
 */
export function stripAdminAuditNote(comment: string | null): string | null {
  if (!comment) return null;
  const cleaned = comment
    .replace(
      /(?:^|\n)\s*Action performed by administrator .*? on behalf of .*?\.\s*(?=\n|$)/g,
      "",
    )
    .trim();
  return cleaned || null;
}
