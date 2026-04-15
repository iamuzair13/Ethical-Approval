"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

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
        callbackUrl: callbackUrl === "/admin" ? "/?portal=admin" : callbackUrl,
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
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 dark:bg-[#020d1a]">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow dark:bg-gray-dark"
      >
        <h1 className="text-xl font-semibold text-dark dark:text-white">Admin Sign In</h1>
        {error && (
          <p className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <div>
          <label className="mb-1 block text-sm">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border border-stroke px-3 py-2 dark:border-dark-3 dark:bg-transparent"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-sm">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-stroke px-3 py-2 pr-20 dark:border-dark-3 dark:bg-transparent"
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
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-primary px-4 py-2 text-white disabled:opacity-70"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}

function AdminLoginFallback() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4 dark:bg-[#020d1a]">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow dark:bg-gray-dark">
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
