export type SapEmployeeVerifyErrorCode =
  | "INVALID_EMAIL"
  | "NOT_FOUND"
  | "SAP_ERROR";

export type SapEmployeeVerifySuccess = {
  ok: true;
  sapId: string;
  email: string;
  employeeRecord: Record<string, unknown>;
  employeeName: string | null;
  department: string | null;
  designation: string | null;
};

export type SapEmployeeVerifyFailure = {
  ok: false;
  errorCode: SapEmployeeVerifyErrorCode;
};

export type SapEmployeeVerifyResult =
  | SapEmployeeVerifySuccess
  | SapEmployeeVerifyFailure;

const SAP_EMP_BASE =
  "http://uolerp.uol.edu.pk:8000/sap/opu/odata/sap/Z_EMP_INFO_API_SRV/empinfoSet";

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

function buildSapEmpAuthHeader(): string | null {
  const username = process.env.SAP_EMP_BASIC_AUTH_USERNAME?.trim();
  const password = process.env.SAP_EMP_BASIC_AUTH_PASSWORD?.trim();
  if (!username || !password) {
    return null;
  }

  const encoded = Buffer.from(`${username}:${password}`, "utf-8").toString(
    "base64",
  );
  return `Basic ${encoded}`;
}

function isValidEmployeeEmail(email: string): boolean {
  const trimmed = email.trim();
  const at = trimmed.indexOf("@");
  return at > 0 && at < trimmed.length - 1;
}

function isEmptyODataPayload(d: unknown): boolean {
  if (d == null) return true;
  if (typeof d !== "object") return false;
  const keys = Object.keys(d as object);
  return keys.length === 0;
}

/** OData `d` fields from Z_EMP_INFO_API_SRV (verified against live API). */
function extractEmployeeName(d: Record<string, unknown>): string | null {
  const first = getStringField(d, ["FirstName", "firstName"]);
  const last = getStringField(d, ["LastName", "lastName"]);
  if (first && last) return `${first} ${last}`.trim();
  return (
    getStringField(d, [
      "FullName",
      "EmployeeName",
      "Name",
      "EmpName",
    ]) ?? first ?? last
  );
}

function extractSapId(d: Record<string, unknown>): string | null {
  return getStringField(d, [
    "EmployeeId",
    "Pernr",
    "EmpId",
    "SapId",
    "PersonnelNumber",
  ]);
}

function parseEmployeeSuccess(
  d: Record<string, unknown>,
  normalizedEmail: string,
): SapEmployeeVerifySuccess | SapEmployeeVerifyFailure {
  const sapId = extractSapId(d);
  if (!sapId) {
    return { ok: false, errorCode: "SAP_ERROR" };
  }

  const record = d as Record<string, unknown> & { __metadata?: unknown };
  const { __metadata: _omit, ...rest } = record;

  return {
    ok: true,
    sapId,
    email: normalizedEmail,
    employeeRecord: rest,
    employeeName: extractEmployeeName(rest),
    department: getStringField(rest, [
      "Department",
      "DeptName",
      "Dept",
    ]),
    designation: getStringField(rest, [
      "Designation",
      "Position",
      "JobTitle",
    ]),
  };
}

async function fetchEmployeeByKey(
  emailKey: string,
  authHeader: string | null,
): Promise<
  | { kind: "found"; d: Record<string, unknown> }
  | { kind: "not_found" }
  | { kind: "error" }
> {
  const url = `${SAP_EMP_BASE}('${encodeURIComponent(emailKey)}')?$format=json`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
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
      return { kind: "not_found" };
    }

    const contentType = res.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("application/json")) {
      return { kind: "error" };
    }

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      return { kind: "error" };
    }

    if (!res.ok) {
      return { kind: "error" };
    }

    const body = json as { d?: Record<string, unknown>; error?: unknown };
    if (body.error) {
      return { kind: "not_found" };
    }

    const d = body.d;
    if (!d || typeof d !== "object" || isEmptyODataPayload(d)) {
      return { kind: "not_found" };
    }

    return { kind: "found", d: d as Record<string, unknown> };
  } catch {
    return { kind: "error" };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Validates faculty/staff against SAP using full email as empinfoSet key.
 * Tries uppercase key first, then lowercase fallback.
 */
export async function verifyEmployeeByEmail(
  email: string,
): Promise<SapEmployeeVerifyResult> {
  const trimmed = email.trim();
  if (!isValidEmployeeEmail(trimmed)) {
    return { ok: false, errorCode: "INVALID_EMAIL" };
  }

  const authHeader = buildSapEmpAuthHeader();
  if (!authHeader) {
    return { ok: false, errorCode: "SAP_ERROR" };
  }

  const normalizedEmail = trimmed.toLowerCase();
  const keys = [trimmed.toUpperCase(), normalizedEmail];
  const uniqueKeys = [...new Set(keys)];

  let lastResult:
    | { kind: "not_found" }
    | { kind: "error" }
    | null = null;

  for (const key of uniqueKeys) {
    const result = await fetchEmployeeByKey(key, authHeader);
    if (result.kind === "found") {
      return parseEmployeeSuccess(result.d, normalizedEmail);
    }
    lastResult = result;
    if (result.kind === "error") {
      return { ok: false, errorCode: "SAP_ERROR" };
    }
  }

  if (lastResult?.kind === "not_found") {
    return { ok: false, errorCode: "NOT_FOUND" };
  }

  return { ok: false, errorCode: "SAP_ERROR" };
}
