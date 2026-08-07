"use client";

import { Logo } from "@/components/logo";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { GoogleIcon } from "@/assets/icons";
import { resolvePostLoginRedirect } from "@/lib/post-login-redirect";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingManual, setLoadingManual] = useState(false);
  const [manualEmail, setManualEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const callbackUrl = useMemo(() => {
    const raw = searchParams.get("callbackUrl");
    return raw?.startsWith("/") ? raw : "/admin";
  }, [searchParams]);

  const handleGoogle = async () => {
    setError(null);
    setLoadingGoogle(true);
    try {
      const { signInStudentViaGoogleBrowserToken } = await import(
        "@/lib/student-google-browser-signin"
      );
      const res = await signInStudentViaGoogleBrowserToken(signIn, callbackUrl);
      if (!res.ok) {
        const message =
          res.errorCode === "Configuration"
            ? "Server authentication is misconfigured."
            : res.errorCode === "FACULTY_NOT_FOUND"
              ? "Your email was not found in the system. Please contact the administrator."
              : res.message ?? "Google sign-in failed.";
        setError(message);
        toast.error(message);
        return;
      }
      toast.success("Login successful.");
      router.push(res.redirectUrl);
      router.refresh();
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const email = manualEmail.trim();
    if (!email) {
      setError("Enter your university email.");
      return;
    }

    setLoadingManual(true);
    try {
      // Verify the email exists in the system
      const verifyRes = await fetch("/api/auth/verify-student?admin=1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!verifyRes.ok) {
        const verifyBody = (await verifyRes.json().catch(() => null)) as
          | { errorCode?: string }
          | null;
        const message =
          verifyBody?.errorCode === "FACULTY_NOT_FOUND"
            ? "Your email was not found in the system."
            : verifyBody?.errorCode === "FACULTY_INACTIVE"
              ? "Your account is inactive. Please contact the administrator."
              : verifyBody?.errorCode === "ADMIN_ROLE_REQUIRED"
                ? "Your account does not have admin access. Please contact the administrator."
                : "Unable to verify your account.";
        setError(message);
        toast.error(message);
        return;
      }

      const result = await signIn("student-email", {
        email,
        redirect: false,
        callbackUrl,
      });

      if (result?.error || !result?.ok) {
        setError("Sign-in failed. Please try again.");
        toast.error("Sign-in failed.");
        return;
      }

      toast.success("Login successful.");
      const redirectUrl = await resolvePostLoginRedirect(result.url ?? callbackUrl);
      router.push(redirectUrl);
      router.refresh();
    } finally {
      setLoadingManual(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#3b5bdb] via-[#4c6ef5] to-[#364fc7] flex sm:px-8">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_420px]  lg:items-center lg:gap-12">
        <div className="text-white max-lg:text-center">
          <Link href="/" className="inline-block">
            <Image src="/images/logo/logo-white.png" alt="Logo" width={200} height={100} />
          </Link>
          <h1 className="mt-10 text-4xl font-semibold tracking-tight sm:text-5xl">
            Ethical Approval Process
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-slate-100 max-lg:mx-auto">
            Admin portal access for administrators, supervisors, and IREB members.
            Sign in with your University of Lahore Google account.
          </p>
        </div>

        <div className="w-full max-w-md justify-self-center lg:justify-self-end">
          <div className="rounded-2xl bg-white px-5 py-8 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] sm:px-8 dark:bg-gray-dark">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
                Admin Sign in
              </h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-dark-6">
                University of Lahore · Admin Portal
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200"
              >
                {error}
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
                    or use email
                  </span>
                </div>
              </div>

              <form onSubmit={handleManualSubmit} className="space-y-3">
                <label className="block">
                  <span className="mb-1.5 block text-left text-xs font-medium text-slate-700 dark:text-dark-6">
                    University email
                  </span>
                  <input
                    type="email"
                    name="email"
                    autoComplete="email"
                    value={manualEmail}
                    onChange={(e) => setManualEmail(e.target.value)}
                    placeholder="admin@uol.edu.pk"
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
                  {loadingManual ? "Verifying…" : "Sign in with email"}
                </button>
              </form>
            </div>

            <p className="mt-8 text-center text-xs text-slate-500 dark:text-dark-6">
              Use your university email to sign in. Your account must be active in the system.
            </p>

            <p className="mt-4 text-center text-sm text-slate-600 dark:text-dark-6">
              <Link href="/" className="font-medium text-primary hover:underline">
                Back to dashboard
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminLoginFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#3b5bdb] via-[#4c6ef5] to-[#364fc7] px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow dark:bg-gray-dark">
        <p className="text-sm text-dark-5">Loading admin sign in...</p>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<AdminLoginFallback />}>
      <AdminLoginForm />
    </Suspense>
  );
}
