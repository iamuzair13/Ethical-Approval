import { inferFacultyFromDepartment } from "@/lib/faculty-by-department";

export type SapVerifyErrorCode =
  | "INVALID_EMAIL"
  | "NOT_FOUND"
  | "SAP_ERROR";

export type SapVerifySuccess = {
  ok: true;
  sapId: string;
  email: string;
  studentRecord: Record<string, unknown>;
  studentName: string | null;
};

export type SapVerifyFailure = {
  ok: false;
  errorCode: SapVerifyErrorCode;
};

export type SapVerifyResult = SapVerifySuccess | SapVerifyFailure;

const SAP_BASE =
  "http://uolerp.uol.edu.pk:8000/sap/opu/odata/sap/ZSTUDENTHMIS_SRV/studentSet";

function getStringField(
  rec: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = rec[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

function enrichStudentRecordWithFaculty(
  rec: Record<string, unknown>,
): Record<string, unknown> {
  const existingFaculty = getStringField(rec, [
    "Faculty",
    "FacName",
    "FacultyName",
  ]);
  if (existingFaculty) return rec;

  const department = getStringField(rec, ["DeptName", "Dept", "Department"]);
  if (!department) return rec;

  const inferredFaculty = inferFacultyFromDepartment(department);
  if (!inferredFaculty) return rec;

  return {
    ...rec,
    Faculty: inferredFaculty,
    FacultyName: inferredFaculty,
  };
}

function buildSapAuthHeader(): string | null {
  const username = process.env.SAP_BASIC_AUTH_USERNAME?.trim();
  const password = process.env.SAP_BASIC_AUTH_PASSWORD?.trim();
  if (!username || !password) {
    return null;
  }

  const encoded = Buffer.from(`${username}:${password}`, "utf-8").toString(
    "base64",
  );
  return `Basic ${encoded}`;
}

function extractSapIdFromEmail(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.indexOf("@");
  if (at <= 0) return null;
  const local = trimmed.slice(0, at);
  if (!local || !/^[a-zA-Z0-9_-]+$/.test(local)) return null;
  return local;
}

function isEmptyODataPayload(d: unknown): boolean {
  if (d == null) return true;
  if (typeof d !== "object") return false;
  const keys = Object.keys(d as object);
  return keys.length === 0;
}

/** Best-effort name from SAP OData `d` object — do not assume specific fields exist. */
function extractStudentName(d: Record<string, unknown>): string | null {
  const candidates = [
    "StName",
    "StudentName",
    "FullName",
    "Name",
    "FirstName",
    "Sname",
    "Zzstuname",
  ];
  for (const key of candidates) {
    const v = d[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  for (const v of Object.values(d)) {
    if (typeof v === "string" && v.trim().length > 2 && /[a-zA-Z]/.test(v)) {
      return v.trim();
    }
  }
  return null;
}

/**
 * Validates the student against SAP using SAP ID derived from email (local part before @).
 * SAP response is the source of truth; email is only used to derive SAP ID.
 */
export async function verifyStudentByEmail(
  email: string,
): Promise<SapVerifyResult> {
  const sapId = extractSapIdFromEmail(email);
  if (!sapId) {
    return { ok: false, errorCode: "INVALID_EMAIL" };
  }

  const url = `${SAP_BASE}('${encodeURIComponent(sapId)}')?$format=json`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const authHeader = buildSapAuthHeader();
    const headers: HeadersInit = {
      Accept: "application/json",
    };
    if (authHeader) {
      headers.Authorization = authHeader;
    }

    const res = await fetch(url, {
      cache: "no-store",
      headers,
      signal: controller.signal,
    });

    if (res.status === 404) {
      return { ok: false, errorCode: "NOT_FOUND" };
    }

    const contentType = res.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("application/json")) {
      return { ok: false, errorCode: "SAP_ERROR" };
    }

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return { ok: false, errorCode: "SAP_ERROR" };
    }

    if (!res.ok) {
      return { ok: false, errorCode: "SAP_ERROR" };
    }

    const body = json as { d?: Record<string, unknown>; error?: unknown };
    if (body.error) {
      return { ok: false, errorCode: "NOT_FOUND" };
    }

    const d = body.d;
    if (!d || typeof d !== "object" || isEmptyODataPayload(d)) {
      return { ok: false, errorCode: "NOT_FOUND" };
    }

    const record = d as Record<string, unknown> & { __metadata?: unknown };
    const { __metadata: _omit, ...rest } = record;
    const studentName = extractStudentName(rest);

    return {
      ok: true,
      sapId,
      email: email.trim().toLowerCase(),
      studentRecord: enrichStudentRecordWithFaculty(rest),
      studentName,
    };
  } catch {
    return { ok: false, errorCode: "SAP_ERROR" };
  } finally {
    clearTimeout(timeout);
  }
}
