import nodemailer from "nodemailer";

export function isSmtpEnabled(): boolean {
  const v = process.env.SMTP_ENABLED?.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

/** Base URL for optional login links (no trailing slash). */
export function getPublicAppUrl(): string | undefined {
  const explicit = process.env.IREB_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  const nextAuth = process.env.NEXTAUTH_URL?.trim();
  if (nextAuth) return nextAuth.replace(/\/$/, "");
  return undefined;
}

function readSmtpSettings():
  | { ok: true; host: string; port: number; secure: boolean; user?: string; pass: string; from: string }
  | { ok: false; reason: string } {
  const host = process.env.SMTP_HOST?.trim();
  const portRaw = process.env.SMTP_PORT?.trim();
  const from = process.env.SMTP_FROM?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASSWORD ?? "";

  if (!host) return { ok: false, reason: "SMTP_HOST is missing." };
  if (!portRaw) return { ok: false, reason: "SMTP_PORT is missing." };
  if (!from) return { ok: false, reason: "SMTP_FROM is missing." };

  const port = Number.parseInt(portRaw, 10);
  if (!Number.isFinite(port) || port <= 0) {
    return { ok: false, reason: "SMTP_PORT is invalid." };
  }

  const secure = process.env.SMTP_SECURE?.trim().toLowerCase() === "true";

  return { ok: true, host, port, secure, user: user || undefined, pass, from };
}

export function createMailTransport(): nodemailer.Transporter | null {
  const settings = readSmtpSettings();
  if (!settings.ok) {
    console.error("[email]", settings.reason);
    return null;
  }

  try {
    return nodemailer.createTransport({
      host: settings.host,
      port: settings.port,
      secure: settings.secure,
      auth:
        settings.user !== undefined
          ? {
              user: settings.user,
              pass: settings.pass,
            }
          : undefined,
    });
  } catch (e) {
    console.error("[email] Failed to create SMTP transport.", e);
    return null;
  }
}
