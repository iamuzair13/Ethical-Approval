import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { existsSync } from "fs";
import { mkdir, readdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const PROFILE_IMAGES_DIR = path.join(
  process.cwd(),
  "public",
  "images",
  "profile_images",
);
const PROFILE_IMAGES_PUBLIC_PATH = "/images/profile_images";

const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // 2 MB

function sanitizeSapIdForFilename(raw: string): string | null {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!cleaned || cleaned.length > 50) return null;
  return cleaned;
}

async function removeExistingAvatarFiles(safeSapId: string): Promise<void> {
  if (!existsSync(PROFILE_IMAGES_DIR)) return;
  let entries: string[];
  try {
    entries = await readdir(PROFILE_IMAGES_DIR);
  } catch {
    return;
  }
  // Match both legacy filenames "<sapId>.<ext>" and versioned filenames
  // "<sapId>-<ts>.<ext>" so a re-upload always replaces the prior avatar.
  await Promise.all(
    entries
      .filter(
        (name) =>
          name.startsWith(`${safeSapId}.`) ||
          name.startsWith(`${safeSapId}-`),
      )
      .map((name) =>
        unlink(path.join(PROFILE_IMAGES_DIR, name)).catch(() => undefined),
      ),
  );
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const sapId = session?.user?.sapId?.trim();
  if (!sapId) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }
  const safeSapId = sanitizeSapIdForFilename(sapId);
  if (!safeSapId) {
    return NextResponse.json(
      { ok: false, error: "Invalid identity." },
      { status: 400 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Multipart form data required." },
      { status: 400 },
    );
  }

  const file = formData.get("avatar");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "Missing 'avatar' file in form data." },
      { status: 400 },
    );
  }
  if (file.size === 0) {
    return NextResponse.json(
      { ok: false, error: "The selected file is empty." },
      { status: 400 },
    );
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return NextResponse.json(
      {
        ok: false,
        error: `File too large. Max ${(MAX_AVATAR_BYTES / 1024 / 1024).toFixed(1)} MB.`,
      },
      { status: 400 },
    );
  }
  const ext = ALLOWED_MIME_TO_EXT[file.type.toLowerCase()];
  if (!ext) {
    return NextResponse.json(
      {
        ok: false,
        error: "Unsupported image type. Allowed: PNG, JPG, GIF, WebP.",
      },
      { status: 400 },
    );
  }

  await mkdir(PROFILE_IMAGES_DIR, { recursive: true });
  await removeExistingAvatarFiles(safeSapId);

  const buffer = Buffer.from(await file.arrayBuffer());
  // Embed a timestamp in the filename so each upload yields a fresh URL —
  // browsers and the next/image optimizer both pick it up without needing
  // a query-string cache-buster (which would require images.localPatterns).
  const version = Date.now();
  const filename = `${safeSapId}-${version}.${ext}`;
  await writeFile(path.join(PROFILE_IMAGES_DIR, filename), buffer);

  const publicUrl = `${PROFILE_IMAGES_PUBLIC_PATH}/${filename}`;

  await db.query(
    `INSERT INTO user_profiles (sap_id, avatar_url)
     VALUES ($1, $2)
     ON CONFLICT (sap_id) DO UPDATE SET avatar_url = EXCLUDED.avatar_url`,
    [sapId, publicUrl],
  );

  return NextResponse.json({ ok: true, avatarUrl: publicUrl });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  const sapId = session?.user?.sapId?.trim();
  if (!sapId) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }
  const safeSapId = sanitizeSapIdForFilename(sapId);
  if (safeSapId) {
    await removeExistingAvatarFiles(safeSapId);
  }
  await db.query(
    `UPDATE user_profiles SET avatar_url = NULL WHERE sap_id = $1`,
    [sapId],
  );
  return NextResponse.json({ ok: true, avatarUrl: "" });
}
