/**
 * Pure JSON parsing for ethics attachment values. Safe to import from Client Components.
 * (Do not import `submission-file-storage` or `submission-attachment-resolve` from the browser —
 * those depend on Node `fs`.)
 */

export type StoredAttachmentMeta = {
  fileName: string;
  /** Path relative to upload root, POSIX-style */
  storageKey: string;
};

function pickTrimmedString(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v.trim() : null;
}

/**
 * Reads stored attachment metadata from JSON (camelCase or snake_case).
 */
export function normalizeStoredAttachmentMeta(value: unknown): StoredAttachmentMeta | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const o = value as Record<string, unknown>;
  const fileName = pickTrimmedString(o.fileName ?? o.file_name);
  const storageKey = pickTrimmedString(o.storageKey ?? o.storage_key);
  if (!fileName || !storageKey) return null;
  return { fileName, storageKey };
}

/** For admin UI: display name and whether a server-side binary exists. */
export function describeEthicsAttachmentValue(raw: unknown): {
  displayName: string;
  hasStoredFile: boolean;
} | null {
  if (typeof raw === "string" && raw.trim()) {
    return { displayName: raw.trim(), hasStoredFile: false };
  }
  const meta = normalizeStoredAttachmentMeta(raw);
  if (meta) {
    return { displayName: meta.fileName, hasStoredFile: true };
  }
  return null;
}

export function isStoredAttachmentMeta(value: unknown): value is StoredAttachmentMeta {
  return normalizeStoredAttachmentMeta(value) !== null;
}

export function parseSlotAttachment(
  raw: unknown,
): { kind: "stored"; meta: StoredAttachmentMeta } | { kind: "nameOnly"; fileName: string } | null {
  if (typeof raw === "string" && raw.trim()) {
    return { kind: "nameOnly", fileName: raw.trim() };
  }
  const meta = normalizeStoredAttachmentMeta(raw);
  if (meta) {
    return { kind: "stored", meta };
  }
  return null;
}

export function parseExtraAttachment(
  raw: unknown,
  index: number,
): { kind: "stored"; meta: StoredAttachmentMeta; index: number } | { kind: "nameOnly"; fileName: string; index: number } | null {
  if (typeof raw === "string" && raw.trim()) {
    return { kind: "nameOnly", fileName: raw.trim(), index };
  }
  const meta = normalizeStoredAttachmentMeta(raw);
  if (meta) {
    return { kind: "stored", meta, index };
  }
  return null;
}
