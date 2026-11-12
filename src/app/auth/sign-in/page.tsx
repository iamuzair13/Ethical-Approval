import Signin from "@/components/Auth/Signin";
import type { Metadata } from "next";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Sign in · Ethical Approval",
};

function SigninFallback() {
  return (
    <div className="auth-bg flex min-h-dvh items-center justify-center px-4">
      <div className="flex items-center gap-3 rounded-xl bg-white/10 px-6 py-4 text-white backdrop-blur">
        <span className="inline-block size-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
        <span className="text-sm font-medium">Loading sign-in…</span>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<SigninFallback />}>
      <Signin />
    </Suspense>
  );
}
