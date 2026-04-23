import { parseExtraAttachment, parseSlotAttachment } from "@/lib/ethics-attachment-meta";
import { getAbsolutePathForStorageKey } from "@/lib/submission-file-storage";

export type { StoredAttachmentMeta } from "@/lib/ethics-attachment-meta";
export {
  describeEthicsAttachmentValue,
  isStoredAttachmentMeta,
  normalizeStoredAttachmentMeta,
  parseExtraAttachment,
  parseSlotAttachment,
} from "@/lib/ethics-attachment-meta";

export type ResolvedAttachmentFile =
  | { ok: true; absolutePath: string; downloadName: string }
  | { ok: false; reason: "not_found" | "name_only" | "bad_key" };

export function resolveAttachmentForSlot(
  ethics: Record<string, unknown> | null,
  slotLabel: string,
): ResolvedAttachmentFile {
  if (!ethics) return { ok: false, reason: "not_found" };
  const raw = ethics.attachmentFiles;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, reason: "not_found" };
  }
  const v = (raw as Record<string, unknown>)[slotLabel];
  const parsed = parseSlotAttachment(v);
  if (!parsed) return { ok: false, reason: "not_found" };
  if (parsed.kind === "nameOnly") return { ok: false, reason: "name_only" };
  const abs = getAbsolutePathForStorageKey(parsed.meta.storageKey);
  if (!abs) return { ok: false, reason: "bad_key" };
  return { ok: true, absolutePath: abs, downloadName: parsed.meta.fileName };
}

export function resolveAttachmentForExtraIndex(
  ethics: Record<string, unknown> | null,
  index: number,
): ResolvedAttachmentFile {
  if (!ethics || !Number.isInteger(index) || index < 0) {
    return { ok: false, reason: "not_found" };
  }
  const raw = ethics.extraUploadFiles;
  if (!Array.isArray(raw) || index >= raw.length) {
    return { ok: false, reason: "not_found" };
  }
  const parsed = parseExtraAttachment(raw[index], index);
  if (!parsed) return { ok: false, reason: "not_found" };
  if (parsed.kind === "nameOnly") return { ok: false, reason: "name_only" };
  const abs = getAbsolutePathForStorageKey(parsed.meta.storageKey);
  if (!abs) return { ok: false, reason: "bad_key" };
  return { ok: true, absolutePath: abs, downloadName: parsed.meta.fileName };
}
