/**
 * Strips administrator audit suffixes from decision comments.
 */
export function stripAdminAuditNote(comment: string | null): string | null {
  if (!comment) return null;
  const cleaned = comment
    .replace(
      /(?:^|\n)\s*Action performed by administrator .*? on behalf of .*?\.\s*(?=\n|$)/g,
      "",
    )
    .replace(
      /(?:^|\n)\s*Action performed by administrator .*? while viewing as .*?\.\s*(?=\n|$)/g,
      "",
    )
    .trim();
  return cleaned || null;
}
