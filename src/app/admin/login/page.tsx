"use client";

import { Logo } from "@/components/logo";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import Image from "next/image";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const callbackUrl = useMemo(() => {
    const raw = searchParams.get("callbackUrl");
    return raw?.startsWith("/") ? raw : "/admin";
  }, [searchParams]);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signIn("admin-credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error || !result?.ok) {
        setError("Invalid admin credentials.");
        return;
      }
      router.push(result.url ?? callbackUrl);
      router.refresh();
    } finally {
      setLoading(false);
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
            Ethical Approval System
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-slate-100 max-lg:mx-auto">
            Admin portal access for administrators, deans, and IREB members.
            Sign in with your assigned email and password.
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

            <form onSubmit={onSubmit} className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-left text-xs font-medium text-slate-700 dark:text-dark-6">
                  Email
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@uol.edu.pk"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none ring-primary/30 placeholder:text-slate-400 focus:border-primary focus:ring-2 disabled:opacity-60 dark:border-dark-3 dark:bg-[#020d1a] dark:text-white"
                  required
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-left text-xs font-medium text-slate-700 dark:text-dark-6">
                  Password
                </span>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 pr-20 text-sm text-slate-900 outline-none ring-primary/30 placeholder:text-slate-400 focus:border-primary focus:ring-2 disabled:opacity-60 dark:border-dark-3 dark:bg-[#020d1a] dark:text-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs font-medium text-dark-5 hover:bg-gray-1 dark:hover:bg-dark-2"
                  >
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white shadow transition hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading && (
                  <span className="inline-block size-4 animate-spin rounded-full border-2 border-solid border-white border-t-transparent" />
                )}
                {loading ? "Signing in..." : "Sign in with email"}
              </button>
            </form>

            <p className="mt-8 text-center text-xs text-slate-500 dark:text-dark-6">
              Use your assigned admin credentials to access the approval dashboard.
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
