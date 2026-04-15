"use client";

import { GoogleIcon } from "@/assets/icons";
import { Logo } from "@/components/logo";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useCallback, useMemo, useState } from "react";

function validateStudentEmailFormat(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.indexOf("@");
  if (at <= 0) {
    return "Enter a full email address (e.g. 70088579@studen.uol.edu.pk).";
  }
  const local = trimmed.slice(0, at);
  if (!local || !/^[a-zA-Z0-9_-]+$/.test(local)) {
    return "Invalid SAP ID: use only letters, numbers, _ or - before the @ symbol.";
  }
  return null;
}

function mapAuthError(code: string | null): string | null {
  if (!code) return null;
  switch (code) {
    case "INVALID_EMAIL":
      return "Invalid email format. The part before @ must be a valid SAP student ID.";
    case "NOT_FOUND":
      return "No matching student record was found in SAP for this SAP ID.";
    case "SAP_ERROR":
      return "The SAP service could not be reached or returned an error. Please try again later.";
    case "MissingEmail":
      return "Google did not return an email address. Use another account or testing mode.";
    case "AccessDenied":
      return "Sign-in was denied. If you use Google, your account must exist in SAP.";
    case "Configuration":
      return "Server authentication is misconfigured. Check environment variables.";
    case "Verification":
      return "The sign-in link is no longer valid.";
    default:
      return `Sign-in failed (${code}). Please try again or use testing mode.`;
  }
}

function mapSapError(code: string | null): string {
  switch (code) {
    case "INVALID_EMAIL":
      return "Invalid SAP ID format in email. Example: 70088579@studen.uol.edu.pk";
    case "NOT_FOUND":
      return "No student record was found in SAP for this SAP ID.";
    case "SAP_ERROR":
      return "SAP verification service is unavailable or returned unexpected data.";
    default:
      return "Unable to verify against SAP. Please try again.";
  }
}

export default function Signin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [manualEmail, setManualEmail] = useState("");
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingManual, setLoadingManual] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const callbackUrl = useMemo(() => {
    const raw = searchParams.get("callbackUrl");
    if (raw?.startsWith("/")) return raw;
    return "/profile";
  }, [searchParams]);

  const urlError = useMemo(
    () => mapAuthError(searchParams.get("error")),
    [searchParams],
  );

  const displayError = formError ?? urlError;

  const handleGoogle = useCallback(async () => {
    setFormError(null);
    setLoadingGoogle(true);
    try {
      await signIn("google", { callbackUrl, redirect: true });
    } finally {
      setLoadingGoogle(false);
    }
  }, [callbackUrl]);

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const email = manualEmail.trim();
    if (!email) {
      setFormError("Enter your student email.");
      return;
    }

    const formatError = validateStudentEmailFormat(email);
    if (formatError) {
      setFormError(formatError);
      return;
    }

    setLoadingManual(true);
    try {
      const studentTarget = email
        .toLowerCase()
        .endsWith("@student.uol.edu.pk")
        ? "/profile"
        : callbackUrl;

      const verifyRes = await fetch("/api/auth/verify-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!verifyRes.ok) {
        const verifyBody = (await verifyRes.json().catch(() => null)) as
          | { errorCode?: string }
          | null;
        setFormError(mapSapError(verifyBody?.errorCode ?? null));
        return;
      }

      const result = await signIn("student-email", {
        email,
        redirect: false,
        callbackUrl: studentTarget,
      });

      if (result?.error) {
        setFormError("Sign-in failed after verification. Please try again.");
        return;
      }

      if (result?.ok) {
        router.push(result?.url ?? studentTarget);
        router.refresh();
      }
    } finally {
      setLoadingManual(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#3b5bdb] via-[#4c6ef5] to-[#364fc7] px-4 py-10 sm:px-8">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_420px] lg:items-center lg:gap-12">
        <div className="text-white max-lg:text-center">
          <Link href="/" className="inline-block">
            <Logo />
          </Link>
          <h1 className="mt-10 text-4xl font-semibold tracking-tight sm:text-5xl">
            Ethical Approval System
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-slate-100 max-lg:mx-auto">
            Sign in with your University Google account. Access is granted only after
            your student record is verified against SAP.
          </p>
        </div>

        <div className="w-full max-w-md justify-self-center lg:justify-self-end">
          <div className="rounded-2xl bg-white px-5 py-8 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] sm:px-8 dark:bg-gray-dark">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                Sign in
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-dark-6">
                University of Lahore · IREB
              </p>
            </div>

            {displayError && (
              <div
                role="alert"
                className="mb-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
              >
                {displayError}
              </div>
            )}

            <div className="space-y-4">
              <button
                type="button"
                onClick={handleGoogle}
                disabled={loadingGoogle || loadingManual}
                className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-medium text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-3 dark:bg-dark-2 dark:text-white dark:hover:bg-dark-3"
              >
                {loadingGoogle ? (
                  <span className="inline-block size-5 animate-spin rounded-full border-2 border-solid border-slate-400 border-t-transparent" />
                ) : (
                  <GoogleIcon className="shrink-0" />
                )}
                {loadingGoogle ? "Connecting…" : "Sign in with Google"}
              </button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200 dark:border-dark-3" />
                </div>
                <div className="relative flex justify-center text-xs uppercase tracking-wide">
                  <span className="bg-white px-3 text-slate-500 dark:bg-gray-dark dark:text-dark-6">
                    or continue with email
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/90 p-4 dark:border-amber-900/40 dark:bg-amber-950/30">
                <p className="text-center text-xs font-semibold uppercase tracking-wider text-amber-900 dark:text-amber-200">
                  Testing mode only
                </p>
                <p className="mt-1 text-center text-xs text-amber-800/90 dark:text-amber-100/80">
                  Use when you cannot sign in with Google. Same SAP verification as
                  Google sign-in.
                </p>

                <form onSubmit={handleManualSubmit} className="mt-4 space-y-3">
                  <label className="block">
                    <span className="mb-1.5 block text-left text-xs font-medium text-slate-700 dark:text-dark-6">
                      Student email
                    </span>
                    <input
                      type="email"
                      name="email"
                      autoComplete="email"
                      value={manualEmail}
                      onChange={(e) => setManualEmail(e.target.value)}
                      placeholder="70088579@studen.uol.edu.pk"
                      disabled={loadingManual || loadingGoogle}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-primary/30 placeholder:text-slate-400 focus:border-primary focus:ring-2 disabled:opacity-60 dark:border-dark-3 dark:bg-[#020d1a] dark:text-white"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={loadingManual || loadingGoogle}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loadingManual && (
                      <span className="inline-block size-4 animate-spin rounded-full border-2 border-solid border-white border-t-transparent" />
                    )}
                    {loadingManual ? "Verifying with SAP…" : "Sign in with email"}
                  </button>
                </form>
              </div>
            </div>

            <p className="mt-8 text-center text-xs text-slate-500 dark:text-dark-6">
              By signing in you agree that your SAP ID (from your email) is used only
              for verification.
            </p>

            <p className="mt-4 text-center text-sm text-slate-600 dark:text-dark-6">
              <Link
                href="/"
                className="font-medium text-primary hover:underline"
              >
                Back to dashboard
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
