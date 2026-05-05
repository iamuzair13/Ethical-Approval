/**
 * "Sign in with Google" UX using Google Identity Services in the browser (access token),
 * then the same SAP path as student-email credentials: /api/auth/verify-student + student-email.
 */

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (resp: { access_token?: string; error?: string; error_description?: string }) => void;
          }) => { requestAccessToken: (override?: { prompt?: "" | "none" | "consent" | "select_account" }) => void };
        };
      };
    };
  }
}

function loadGisScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google sign-in is only available in the browser."));
  }
  if (window.google?.accounts?.oauth2) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
    if (existing) {
      const done = () => {
        if (window.google?.accounts?.oauth2) resolve();
        else reject(new Error("Google Identity Services did not initialize."));
      };
      if (existing.dataset.loaded === "1") {
        done();
        return;
      }
      existing.addEventListener("load", done, { once: true });
      existing.addEventListener("error", () => reject(new Error("Failed to load Google script.")), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => {
      s.dataset.loaded = "1";
      resolve();
    };
    s.onerror = () => reject(new Error("Failed to load Google Sign-In script."));
    document.head.appendChild(s);
  });
}

/**
 * Opens Google account picker (or uses existing consent) and returns the Google account email.
 */
export async function getEmailFromGoogleBrowserToken(clientId: string): Promise<string> {
  await loadGisScript();
  if (!window.google?.accounts?.oauth2) {
    throw new Error("Google Identity Services did not load.");
  }

  return new Promise((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: "openid email profile https://www.googleapis.com/auth/userinfo.email",
      callback: async (tokenResponse) => {
        if (tokenResponse.error) {
          const msg = tokenResponse.error_description ?? tokenResponse.error;
          reject(new Error(msg || "Google token error"));
          return;
        }
        const at = tokenResponse.access_token;
        if (!at) {
          reject(new Error("No access token from Google."));
          return;
        }
        try {
          const res = await fetch(
            `https://www.googleapis.com/oauth2/v3/userinfo?access_token=${encodeURIComponent(at)}`,
          );
          if (!res.ok) {
            reject(new Error("Could not read your Google profile."));
            return;
          }
          const data = (await res.json()) as { email?: string };
          const email = data.email?.trim().toLowerCase();
          if (!email) {
            reject(new Error("Google did not return an email address."));
            return;
          }
          resolve(email);
        } catch {
          reject(new Error("Could not read your Google profile."));
        }
      },
    });
    client.requestAccessToken({ prompt: "select_account" });
  });
}

export type StudentGoogleBrowserSignInResult =
  | { ok: true; redirectUrl: string }
  | { ok: false; message?: string; errorCode?: string };

/**
 * Verifies email with SAP (same as testing mode), then creates a NextAuth session via `student-email`.
 */
/** `signIn` from `next-auth/react` (typed loosely so it accepts NextAuth’s overloads). */
export async function signInStudentViaGoogleBrowserToken(
  signIn: (
    provider: string,
    options?: { email?: string; redirect?: boolean; callbackUrl?: string },
  ) => Promise<{ ok?: boolean; error?: string | null; url?: string | null } | undefined>,
  callbackUrl: string,
): Promise<StudentGoogleBrowserSignInResult> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    return {
      ok: false,
      errorCode: "Configuration",
      message:
        "Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID. Add it to .env.local (same Web client ID as GOOGLE_CLIENT_ID) and restart the dev server.",
    };
  }

  let email: string;
  try {
    email = await getEmailFromGoogleBrowserToken(clientId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Google sign-in was cancelled or failed.";
    return { ok: false, errorCode: "AccessDenied", message: msg };
  }

  const verifyRes = await fetch("/api/auth/verify-student", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });

  if (!verifyRes.ok) {
    const verifyBody = (await verifyRes.json().catch(() => null)) as { errorCode?: string } | null;
    return {
      ok: false,
      errorCode: verifyBody?.errorCode ?? "SAP_ERROR",
    };
  }

  const studentTarget = email.endsWith("@student.uol.edu.pk") ? "/profile" : callbackUrl;

  const result = await signIn("student-email", {
    email,
    redirect: false,
    callbackUrl: studentTarget,
  });

  if (result?.error) {
    return { ok: false, message: "Sign-in failed after SAP verification. Please try again." };
  }

  if (result?.ok) {
    return { ok: true, redirectUrl: result.url ?? studentTarget };
  }

  return { ok: false, message: "Sign-in did not complete. Please try again." };
}
