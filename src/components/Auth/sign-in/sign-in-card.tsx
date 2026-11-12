import { AlertTriangle, Lock, ShieldCheck } from "lucide-react";
import { GoogleSignInButton } from "./google-sign-in-button";

export function SignInCard({
  error,
  warning,
  loading,
  onGoogle,
}: {
  error: string | null;
  warning: string | null;
  loading: boolean;
  onGoogle: () => void;
}) {
  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* soft halo behind the card */}
      <div
        aria-hidden
        className="absolute -inset-4 rounded-[32px] bg-gradient-to-br from-indigo-400/25 via-sky-400/10 to-transparent blur-2xl"
      />

      <div className="relative rounded-3xl border border-white/60 bg-white p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.35)] sm:p-10 dark:border-white/10 dark:bg-slate-900/80 dark:backdrop-blur-xl">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-50 to-sky-50 ring-1 ring-indigo-100/80 dark:from-indigo-500/15 dark:to-sky-500/10 dark:ring-white/10">
          <ShieldCheck
            aria-hidden
            className="h-7 w-7 text-indigo-600 dark:text-indigo-300"
            strokeWidth={1.8}
          />
        </div>

        <h2 className="text-center text-[28px] font-semibold leading-tight tracking-tight text-slate-900 dark:text-white">
          Sign in
        </h2>
        <p className="mt-1.5 text-center text-[15px] text-slate-500 dark:text-slate-400">
          University of Lahore · IREB
        </p>

        {warning && (
          <div
            role="status"
            className="mt-6 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm leading-relaxed text-amber-900 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100"
          >
            <AlertTriangle
              aria-hidden
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
            />
            {warning}
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-sm leading-relaxed text-rose-800 dark:border-rose-500/25 dark:bg-rose-500/10 dark:text-rose-200"
          >
            <AlertTriangle
              aria-hidden
              className="mt-0.5 h-4 w-4 shrink-0 text-rose-500"
            />
            {error}
          </div>
        )}

        <GoogleSignInButton loading={loading} onClick={onGoogle} />

        <div aria-hidden className="mt-7 flex items-center gap-3">
          <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
          <span className="text-[13px] font-medium text-slate-400 dark:text-slate-500">
            University accounts only
          </span>
          <span className="h-px flex-1 bg-slate-200 dark:bg-white/10" />
        </div>

        <p className="mt-6 flex items-start justify-center gap-1.5 text-center text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">
          <Lock
            aria-hidden
            className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500"
          />
          <span>
            By signing in you agree that your SAP ID (from your email) is used
            only for verification.
          </span>
        </p>
      </div>
    </div>
  );
}
