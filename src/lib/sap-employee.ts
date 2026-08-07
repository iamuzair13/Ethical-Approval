export type SapEmployeeVerifyErrorCode =
  | "INVALID_EMAIL"
  | "NOT_FOUND"
  | "SAP_ERROR"
  | "SAP_TIMEOUT";

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

const SAP_EMPLOYEE_SET_BASE =
  "http://uolerp.uol.edu.pk:8000/sap/opu/odata/sap/Z_EMP_INFO_API_SRV/EmployeeSet";

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

export type SapEmployeeRecord = {
  sapId: string;
  employeeId: string | null;
  employeeCode: string | null;
  email: string | null;
  employeeName: string | null;
  department: string | null;
  designation: string | null;
  faculty: string | null;
  employeeStatus: string | null;
  employeeGroup: string | null;
  employeeType: string | null;
  sector: string | null;
  orgUnit: string | null;
  leavingDate: string | null;
  raw: Record<string, unknown>;
};

export type SapEmployeeListSuccess = {
  ok: true;
  employees: SapEmployeeRecord[];
};

export type SapEmployeeListFailure = {
  ok: false;
  errorCode: SapEmployeeVerifyErrorCode;
};

export type SapEmployeeListResult = SapEmployeeListSuccess | SapEmployeeListFailure;

function normalizeSapEmployeeRecord(
  d: Record<string, unknown>,
): SapEmployeeRecord | null {
  const sapId = extractSapId(d);
  if (!sapId) return null;

  const record = d as Record<string, unknown> & { __metadata?: unknown };
  const { __metadata: _omit, ...rest } = record;

  return {
    sapId,
    employeeId: getStringField(rest, ["EmployeeId", "EmpId", "PersonnelNumber"]),
    employeeCode: getStringField(rest, ["EmployeeCode", "EmpCode", "Pernr", "PersonnelNo"]),
    email: getStringField(rest, ["EmailAddress", "Email", "EmailId", "E-mail", "email", "SmtpAddr"]),
    employeeName: extractEmployeeName(rest),
    department: getStringField(rest, ["Department", "DeptName", "Dept", "OrgUnitText"]),
    designation: getStringField(rest, ["Designation", "Position", "JobTitle", "PositionText"]),
    faculty: getStringField(rest, ["Faculty", "FacultyName", "FacName", "College"]),
    employeeStatus: getStringField(rest, [
      "EmployeeStatus",
      "EmpStatus",
      "Status",
      "EmploymentStatus",
      "ActiveStatus",
    ]),
    employeeGroup: getStringField(rest, [
      "EmployeeGroup",
      "EmpGroup",
      "PersG",
      "EmployeeClass",
    ]),
    employeeType: getStringField(rest, [
      "EmployeeType",
      "EmpType",
      "PersK",
      "EmploymentType",
    ]),
    sector: getStringField(rest, [
      "Sector",
      "Branche",
      "BusinessSector",
      "Area",
    ]),
    orgUnit: getStringField(rest, [
      "OrgUnit",
      "OrganizationUnit",
      "OrgUnitId",
      "Orgeh",
    ]),
    leavingDate: getStringField(rest, [
      "LeavingDate",
      "TerminationDate",
      "EndDate",
      "LeavDate",
    ]),
    raw: rest,
  };
}

/**
 * Fetches all employee records from SAP EmployeeSet.
 *
 * The SAP OData service has `sap:pageable="false"` — it returns ALL records
 * in a single response with no `__next` pagination links. The response can
 * take 2-5 minutes to complete and may be 10+ MB of JSON.
 *
 * We use a 300-second (5-minute) timeout to accommodate the slow response.
 * No $top parameter is used because the server does not support pagination.
 */
export async function fetchAllEmployees(): Promise<SapEmployeeListResult> {
  const authHeader = buildSapEmpAuthHeader();
  if (!authHeader) {
    return { ok: false, errorCode: "SAP_ERROR" };
  }

  const url = `${SAP_EMPLOYEE_SET_BASE}?$format=json`;
  console.log(`[sap-employee] Fetching all employees from ${url}`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 300000);

  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: authHeader,
      },
      signal: controller.signal,
    });

    if (!res.ok) {
      console.error(`[sap-employee] HTTP ${res.status} ${res.statusText}`);
      return { ok: false, errorCode: "SAP_ERROR" };
    }

    const contentType = res.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.includes("application/json")) {
      console.error(`[sap-employee] Non-JSON content-type: ${contentType}`);
      return { ok: false, errorCode: "SAP_ERROR" };
    }

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      console.error(`[sap-employee] JSON parse failed`);
      return { ok: false, errorCode: "SAP_ERROR" };
    }

    const body = json as { d?: { results?: unknown[] } };
    const results = body.d?.results;
    if (!Array.isArray(results)) {
      console.error(`[sap-employee] No results array in response`);
      return { ok: false, errorCode: "SAP_ERROR" };
    }

    const employees: SapEmployeeRecord[] = [];
    for (const item of results) {
      if (typeof item !== "object" || item == null) continue;
      const d = item as Record<string, unknown>;
      const record = normalizeSapEmployeeRecord(d);
      if (record) employees.push(record);
    }

    console.log(
      `[sap-employee] Fetched ${results.length} raw records, ${employees.length} normalized`,
    );

    return { ok: true, employees };
  } catch (err) {
    const isAbort = err instanceof Error && err.name === "AbortError";
    console.error(
      `[sap-employee] Fetch ${isAbort ? "timed out (300s)" : "failed"}:`,
      err instanceof Error ? err.message : String(err),
    );
    return {
      ok: false,
      errorCode: isAbort ? "SAP_TIMEOUT" : "SAP_ERROR",
    };
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
