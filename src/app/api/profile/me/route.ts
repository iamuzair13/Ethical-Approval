import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { logProfileActivityFromSession } from "@/lib/activity-log/log-profile";
import { db } from "@/lib/db";

type UserProfileRow = {
  sap_id: string;
  phone: string | null;
  bio: string | null;
  avatar_url: string | null;
  locale: string | null;
  notification_email: string | null;
};

export type UserSettingsResponse = {
  ok: true;
  profile: {
    sapId: string;
    phone: string;
    bio: string;
    avatarUrl: string;
    locale: string;
    notificationEmail: string;
  };
};

const FIELD_LIMITS = {
  phone: 40,
  bio: 2000,
  locale: 20,
  notificationEmail: 255,
} as const;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET() {
  const session = await getServerSession(authOptions);
  const sapId = session?.user?.sapId?.trim();
  if (!sapId) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  const result = await db.query<UserProfileRow>(
    `SELECT sap_id, phone, bio, avatar_url, locale, notification_email
     FROM user_profiles
     WHERE sap_id = $1`,
    [sapId],
  );
  const row = result.rows[0] ?? null;

  const response: UserSettingsResponse = {
    ok: true,
    profile: {
      sapId,
      phone: row?.phone ?? "",
      bio: row?.bio ?? "",
      avatarUrl: normalizeAvatarUrl(row?.avatar_url ?? ""),
      locale: row?.locale ?? "",
      notificationEmail: row?.notification_email ?? "",
    },
  };
  return NextResponse.json(response);
}

/**
 * Strips any `?...` query string from locally-served avatar URLs.
 * Older rows may carry a `?v=<timestamp>` cache-buster that next/image
 * rejects without an `images.localPatterns` config — newer uploads embed
 * the version directly in the filename so the URL is clean.
 */
function normalizeAvatarUrl(value: string): string {
  if (!value) return "";
  if (value.startsWith("/")) {
    const queryIndex = value.indexOf("?");
    return queryIndex === -1 ? value : value.slice(0, queryIndex);
  }
  return value;
}

type FieldResult =
  | { ok: true; value: string | null }
  | { ok: false; error: string };

function pickString(
  value: unknown,
  field: keyof typeof FIELD_LIMITS,
): FieldResult {
  if (value === null || value === undefined) return { ok: true, value: null };
  if (typeof value !== "string") {
    return { ok: false, error: `${field} must be a string.` };
  }
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, value: null };
  if (trimmed.length > FIELD_LIMITS[field]) {
    return {
      ok: false,
      error: `${field} exceeds the ${FIELD_LIMITS[field]} character limit.`,
    };
  }
  return { ok: true, value: trimmed };
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const sapId = session?.user?.sapId?.trim();
  if (!sapId) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid JSON body." },
      { status: 400 },
    );
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, error: "Body must be an object." },
      { status: 400 },
    );
  }
  const input = body as Record<string, unknown>;

  const fields = [
    pickString(input.phone, "phone"),
    pickString(input.bio, "bio"),
    pickString(input.locale, "locale"),
    pickString(input.notificationEmail, "notificationEmail"),
  ];

  for (const result of fields) {
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error },
        { status: 400 },
      );
    }
  }

  const [phone, bio, locale, notificationEmail] = fields.map((r) =>
    r.ok ? r.value : null,
  );

  if (notificationEmail && !EMAIL_REGEX.test(notificationEmail)) {
    return NextResponse.json(
      { ok: false, error: "Notification email is invalid." },
      { status: 400 },
    );
  }

  // avatar_url is managed exclusively by /api/profile/me/avatar, not by this
  // PUT, so we COALESCE the existing value to keep it stable across saves.
  const upsert = await db.query<{ avatar_url: string | null }>(
    `INSERT INTO user_profiles (sap_id, phone, bio, locale, notification_email)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (sap_id) DO UPDATE SET
       phone = EXCLUDED.phone,
       bio = EXCLUDED.bio,
       locale = EXCLUDED.locale,
       notification_email = EXCLUDED.notification_email
     RETURNING avatar_url`,
    [sapId, phone, bio, locale, notificationEmail],
  );

  const avatarUrl = upsert.rows[0]?.avatar_url ?? null;

  void logProfileActivityFromSession(session, {
    actionCode: "profile.update",
    targetId: sapId,
    metadata: {
      fields: ["phone", "bio", "locale", "notificationEmail"],
    },
  });

  const response: UserSettingsResponse = {
    ok: true,
    profile: {
      sapId,
      phone: phone ?? "",
      bio: bio ?? "",
      avatarUrl: avatarUrl ?? "",
      locale: locale ?? "",
      notificationEmail: notificationEmail ?? "",
    },
  };
  return NextResponse.json(response);
}
