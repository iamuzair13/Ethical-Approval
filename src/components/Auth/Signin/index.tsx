"use client";

import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useCallback, useMemo, useState, type CSSProperties } from "react";
import { toast } from "sonner";
import { AuthShell } from "@/components/Auth/sign-in/auth-shell";
import { BrandHeader } from "@/components/Auth/sign-in/brand-header";
import { HowItWorksStepper } from "@/components/Auth/sign-in/how-it-works-stepper";
import { SignInCard } from "@/components/Auth/sign-in/sign-in-card";
import { TrustBadges } from "@/components/Auth/sign-in/trust-badges";

function mapAuthError(code: string | null): string | null {
  if (!code) return null;
  switch (code) {
    case "INVALID_EMAIL":
      return "Invalid email format. Please enter a valid university email address.";
    case "NOT_FOUND":
      return "No matching student record was found in SAP for this SAP ID.";
    case "SAP_ERROR":
      return "The SAP service could not be reached or returned an error. Please try again later.";
    case "MissingEmail":
      return "Google did not return an email address. Please use another account.";
    case "AccessDenied":
      return "Sign-in was denied. If you use Google, your account must exist in SAP.";
    case "Configuration":
      return "Server authentication is misconfigured. Check environment variables.";
    case "Verification":
      return "The sign-in link is no longer valid.";
    default:
      return `Sign-in failed (${code}). Please try again.`;
  }
}

const FACULTY_ERP_NOT_FOUND_MESSAGE =
  "We could not find your employee record in the university SAP. Please contact the HR department to ensure your official email and employment details are correctly updated in SAP, then try signing in again.";

function mapSapError(
  code: string | null,
  options?: { isFacultyEmail?: boolean },
): string {
  const isFaculty = options?.isFacultyEmail ?? false;

  switch (code) {
    case "INVALID_EMAIL":
      return isFaculty
        ? "Enter a valid university email address."
        : "Invalid SAP ID format in email. Example: 70088579@studen.uol.edu.pk";
    case "FACULTY_NOT_FOUND":
      return FACULTY_ERP_NOT_FOUND_MESSAGE;
    case "NOT_FOUND":
      return isFaculty
        ? FACULTY_ERP_NOT_FOUND_MESSAGE
        : "No student record was found in SAP for this SAP ID.";
    case "SAP_ERROR":
      return "SAP verification service is unavailable or returned unexpected data.";
    default:
      return "Unable to verify your account. Please try again.";
  }
}

const reveal = (ms: number) =>
  ({ "--reveal-delay": `${ms}ms` }) as CSSProperties;

export default function Signin() {
  const searchParams = useSearchParams();
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formWarning, setFormWarning] = useState<string | null>(null);

  const callbackUrl = useMemo(() => {
    const raw = searchParams.get("callbackUrl");
    if (raw?.startsWith("/")) return raw;
    return "/"; // All users redirect to root after login
  }, [searchParams]);

  const urlError = useMemo(
    () => mapAuthError(searchParams.get("error")),
    [searchParams],
  );

  const displayError = formError ?? urlError;

  const showSignInMessage = (
    message: string,
    options?: { warning?: boolean; toast?: boolean },
  ) => {
    if (options?.warning) {
      setFormWarning(message);
      setFormError(null);
    } else {
      setFormError(message);
      setFormWarning(null);
    }
    if (options?.toast !== false) {
      if (options?.warning) toast.warning(message);
      else toast.error(message);
    }
  };

  const handleGoogle = useCallback(async () => {
    setFormError(null);
    setFormWarning(null);
    setLoadingGoogle(true);
    try {
      const { signInStudentViaGoogleBrowserToken } = await import("@/lib/student-google-browser-signin");
      const res = await signInStudentViaGoogleBrowserToken(signIn, callbackUrl);
      if (!res.ok) {
        if (res.errorCode === "Configuration") {
          showSignInMessage(
            res.message ?? mapAuthError("Configuration") ?? "Server authentication is misconfigured.",
          );
        } else if (res.errorCode === "FACULTY_NOT_FOUND") {
          showSignInMessage(FACULTY_ERP_NOT_FOUND_MESSAGE, { warning: true });
        } else if (res.errorCode) {
          showSignInMessage(mapSapError(res.errorCode));
        } else {
          showSignInMessage(res.message ?? "Google sign-in failed.");
        }
        return;
      }
      toast.success("Login successful.");
      // Use a full-page navigation to ensure the auth cookie is sent.
      window.location.href = res.redirectUrl;
    } finally {
      setLoadingGoogle(false);
    }
  }, [callbackUrl]);

  return (
    <AuthShell
      brand={
        <>
          <div className="auth-reveal" style={reveal(0)}>
            <BrandHeader />
          </div>
          <div className="auth-reveal mt-10 lg:mt-14" style={reveal(80)}>
            <h1 className="font-display text-[40px] font-semibold leading-[1.1] tracking-tight text-white sm:text-[52px] lg:text-[58px]">
              Ethical{" "}
              <span className="bg-gradient-to-r from-sky-300 via-indigo-300 to-teal-200 bg-clip-text text-transparent">
                Approval
              </span>{" "}
              Process
            </h1>
            <p className="auth-reveal mt-5 max-w-xl text-lg leading-[1.65] text-white/80" style={reveal(140)}>
              Submit, track, and manage research ethics applications with the
              University of Lahore IREB. Sign in with your university Google
              account — access is granted after SAP verification.
            </p>
          </div>
        </>
      }
      card={
        <div className="auth-reveal" style={reveal(300)}>
          <SignInCard
            error={displayError}
            warning={formWarning}
            loading={loadingGoogle}
            onGoogle={() => void handleGoogle()}
          />
        </div>
      }
      details={
        <>
          <div className="auth-reveal mt-2 lg:mt-6" style={reveal(200)}>
            <HowItWorksStepper />
          </div>
          <div className="auth-reveal" style={reveal(260)}>
            <TrustBadges />
          </div>
        </>
      }
    />
  );
}
