import { randomUUID } from "crypto";
import { createReadStream } from "fs";
import fs from "fs/promises";
import path from "path";

import type { StoredAttachmentMeta } from "@/lib/ethics-attachment-meta";

export type { StoredAttachmentMeta } from "@/lib/ethics-attachment-meta";

function getUploadRoot(): string {
  return process.env.SUBMISSION_UPLOAD_DIR ?? path.join(process.cwd(), "uploads", "submission-files");
}

export function sanitizeStoredFileBaseName(originalName: string): string {
  const base = path.basename(originalName).replace(/[^\w.\-()+ ]+/g, "_");
  return base.length > 0 ? base.slice(0, 180) : "upload.bin";
}

/**
 * Returns absolute path only if `storageKey` resolves under the upload root (prevents path traversal).
 */
export function getAbsolutePathForStorageKey(storageKey: string): string | null {
  const root = path.resolve(getUploadRoot());
  const normalized = storageKey.replace(/\\/g, "/").replace(/^\//, "");
  if (normalized.includes("..")) return null;
  const abs = path.resolve(root, normalized);
  if (!abs.startsWith(root + path.sep) && abs !== root) {
    return null;
  }
  return abs;
}

export async function saveSubmissionAttachment(
  submissionId: number,
  buffer: Buffer,
  originalName: string,
): Promise<StoredAttachmentMeta> {
  const root = getUploadRoot();
  const dir = path.join(root, String(submissionId));
  await fs.mkdir(dir, { recursive: true });
  const safe = sanitizeStoredFileBaseName(originalName);
  const fileBase = `${randomUUID()}_${safe}`;
  const relKey = path.posix.join(String(submissionId), fileBase.split(path.sep).join("/"));
  const abs = path.join(root, String(submissionId), fileBase);
  await fs.writeFile(abs, buffer);
  return { fileName: originalName, storageKey: relKey };
}

export async function deleteStoredFileIfExists(storageKey: string | undefined): Promise<void> {
  if (!storageKey?.trim()) return;
  const abs = getAbsolutePathForStorageKey(storageKey);
  if (!abs) return;
  try {
    await fs.unlink(abs);
  } catch {
    /* ignore missing */
  }
}

export function createAttachmentReadStream(absPath: string) {
  return createReadStream(absPath);
}

export async function statAttachmentFile(absPath: string) {
  return fs.stat(absPath);
}
