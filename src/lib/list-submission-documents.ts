import type { ApprovalFormId } from "@/app/profile/_components/forms/form-registry";
import { resolveAttachmentSlotLabels } from "@/app/profile/_components/forms/attachment-lists-by-form";
import { describeEthicsAttachmentValue } from "@/lib/ethics-attachment-meta";

export type SubmissionDocumentItem = {
  id: string;
  label: string;
  fileName: string;
  /** Inline API URL when the binary is stored on the server. */
  viewUrl: string | null;
  hasStoredFile: boolean;
};

function inferFormIdFromEthics(ethics: Record<string, unknown> | null): ApprovalFormId | null {
  if (!ethics) return null;
  const rf = ethics.requiredForm;
  if (rf && typeof rf === "object" && !Array.isArray(rf)) {
    const id = (rf as { id?: string }).id;
    if (typeof id === "string") return id as ApprovalFormId;
  }
  return null;
}

function parseSlotMap(raw: unknown): Record<string, { displayName: string | null; hasStoredFile: boolean } | null> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, { displayName: string | null; hasStoredFile: boolean } | null> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const d = describeEthicsAttachmentValue(v);
    out[k] = d ? { displayName: d.displayName, hasStoredFile: d.hasStoredFile } : null;
  }
  return out;
}

function listExtras(raw: unknown): { index: number; displayName: string; hasStoredFile: boolean }[] {
  if (!Array.isArray(raw)) return [];
  const out: { index: number; displayName: string; hasStoredFile: boolean }[] = [];
  raw.forEach((item, index) => {
    const d = describeEthicsAttachmentValue(item);
    if (d) out.push({ index, displayName: d.displayName, hasStoredFile: d.hasStoredFile });
  });
  return out;
}

/** Builds viewable document entries for admin profile / document viewer. */
export function listSubmissionDocuments(
  submissionId: number,
  ethics: Record<string, unknown> | null,
): SubmissionDocumentItem[] {
  if (!ethics) return [];

  const files = parseSlotMap(ethics.attachmentFiles);
  const displayOnly = Object.fromEntries(
    Object.entries(files).map(([k, v]) => [k, v?.displayName ?? ""]),
  );
  const formId = inferFormIdFromEthics(ethics);
  const labels = resolveAttachmentSlotLabels(formId, displayOnly);
  const items: SubmissionDocumentItem[] = [];

  for (const label of labels) {
    const slot = files[label];
    if (!slot?.displayName) continue;
    items.push({
      id: `slot:${label}`,
      label,
      fileName: slot.displayName,
      hasStoredFile: slot.hasStoredFile,
      viewUrl: slot.hasStoredFile
        ? `/api/submissions/${submissionId}/attachment?slot=${encodeURIComponent(label)}`
        : null,
    });
  }

  for (const extra of listExtras(ethics.extraUploadFiles)) {
    items.push({
      id: `extra:${extra.index}`,
      label: `Additional upload ${extra.index + 1}`,
      fileName: extra.displayName,
      hasStoredFile: extra.hasStoredFile,
      viewUrl: extra.hasStoredFile
        ? `/api/submissions/${submissionId}/attachment?extra=${extra.index}`
        : null,
    });
  }

  return items;
}

export function countViewableSubmissionDocuments(documents: SubmissionDocumentItem[]): number {
  return documents.filter((d) => d.viewUrl).length;
}
