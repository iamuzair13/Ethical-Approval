import type { StoredAttachmentMeta } from "@/lib/ethics-attachment-meta";
import { normalizeStoredAttachmentMeta } from "@/lib/ethics-attachment-meta";
import { deleteStoredFileIfExists, saveSubmissionAttachment } from "@/lib/submission-file-storage";

async function readWebFileBuffer(file: File): Promise<Buffer> {
  return Buffer.from(await file.arrayBuffer());
}

function getExistingSlotMeta(
  ethics: Record<string, unknown>,
  label: string,
): StoredAttachmentMeta | undefined {
  const raw = ethics.attachmentFiles;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const v = (raw as Record<string, unknown>)[label];
  return normalizeStoredAttachmentMeta(v) ?? undefined;
}

function getExistingExtraMeta(
  ethics: Record<string, unknown>,
  index: number,
): StoredAttachmentMeta | undefined {
  const raw = ethics.extraUploadFiles;
  if (!Array.isArray(raw) || index < 0 || index >= raw.length) return undefined;
  const v = raw[index];
  return normalizeStoredAttachmentMeta(v) ?? undefined;
}

/**
 * Merges uploaded parts from multipart `FormData` into `ethics.attachmentFiles` and `ethics.extraUploadFiles`.
 * Deletes replaced files on disk when a previous `storageKey` exists.
 */
export async function mergeUploadedFilesIntoEthics(
  formData: FormData,
  submissionId: number,
  baseEthics: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const ethics = {
    ...baseEthics,
    attachmentFiles: {
      ...(baseEthics.attachmentFiles &&
      typeof baseEthics.attachmentFiles === "object" &&
      !Array.isArray(baseEthics.attachmentFiles)
        ? (baseEthics.attachmentFiles as Record<string, unknown>)
        : {}),
    },
    extraUploadFiles: [...(Array.isArray(baseEthics.extraUploadFiles) ? baseEthics.extraUploadFiles : [])],
  } as Record<string, unknown>;

  const af = (ethics.attachmentFiles && typeof ethics.attachmentFiles === "object" && !Array.isArray(ethics.attachmentFiles)
    ? { ...(ethics.attachmentFiles as Record<string, unknown>) }
    : {}) as Record<string, unknown>;

  for (let i = 0; ; i++) {
    const file = formData.get(`req_${i}`);
    const labelRaw = formData.get(`req_${i}_label`);
    if (!file || typeof file === "string") break;
    if (!(file instanceof File)) break;
    if (typeof labelRaw !== "string" || !labelRaw.trim()) continue;

    const label = labelRaw.trim();
    const prev = getExistingSlotMeta({ ...ethics, attachmentFiles: af }, label);
    if (prev) await deleteStoredFileIfExists(prev.storageKey);

    const buf = await readWebFileBuffer(file);
    const saved = await saveSubmissionAttachment(submissionId, buf, file.name);
    af[label] = saved;
  }

  ethics.attachmentFiles = af;

  const extras = Array.isArray(ethics.extraUploadFiles)
    ? [...(ethics.extraUploadFiles as unknown[])]
    : [];

  for (let j = 0; ; j++) {
    const file = formData.get(`ext_${j}`);
    const idxRaw = formData.get(`ext_${j}_index`);
    if (!file || typeof file === "string") break;
    if (!(file instanceof File)) break;
    const idx = Number.parseInt(String(idxRaw ?? ""), 10);
    if (!Number.isInteger(idx) || idx < 0) continue;

    const prev = getExistingExtraMeta({ ...ethics, extraUploadFiles: extras }, idx);
    if (prev) await deleteStoredFileIfExists(prev.storageKey);

    const buf = await readWebFileBuffer(file);
    const saved = await saveSubmissionAttachment(submissionId, buf, file.name);
    while (extras.length <= idx) extras.push("");
    extras[idx] = saved;
  }

  ethics.extraUploadFiles = extras;
  return ethics;
}
