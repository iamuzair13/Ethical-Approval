"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { motion, type Variants } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import BreadcrumbBase from "@/components/Breadcrumbs/Breadcrumb";
import {
  MagneticButton,
  SpotlightCard,
} from "@/app/profile/_components/profile-visuals";

const LOCALE_OPTIONS = [
  { value: "", label: "Use account default" },
  { value: "en-PK", label: "English (Pakistan)" },
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "ur-PK", label: "Urdu (Pakistan)" },
];

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const PROFILE_AVATAR_CHANGED_EVENT = "ireb:profile-avatar-changed";

type EditableProfile = {
  phone: string;
  bio: string;
  locale: string;
  notificationEmail: string;
};

type FullProfile = EditableProfile & { avatarUrl: string };

const EMPTY_PROFILE: EditableProfile = {
  phone: "",
  bio: "",
  locale: "",
  notificationEmail: "",
};

type SessionUser = {
  name?: string;
  email?: string;
  sapId?: string;
  applicantRole?: "student" | "faculty";
  adminRole?: "administrator" | "supervisor" | "ireb";
  facultyDepartment?: string;
  facultyDesignation?: string | null;
  studentRecord?: {
    Name?: string;
    SapNo?: string;
    RegNo?: string;
    DeptName?: string;
    FacultyName?: string;
    Faculty?: string;
    DegrTitle?: string;
    Program?: string;
  };
};

function broadcastAvatarChange(avatarUrl: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<string>(PROFILE_AVATAR_CHANGED_EVENT, {
      detail: avatarUrl,
    }),
  );
}

const labelClasses =
  "text-[11px] font-semibold uppercase tracking-wider text-dark-6 dark:text-slate-500";

const inputClasses =
  "w-full rounded-xl border border-stroke bg-white/60 px-4 py-2.5 text-sm text-dark transition-colors placeholder:text-dark-5/70 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-white/[0.03] dark:text-white dark:placeholder:text-slate-600";

const readOnlyValueClasses =
  "break-words text-sm font-semibold text-dark dark:text-white";

function ReadOnlyRow({ label, value }: { label: string; value: ReactNode }) {
  const display =
    value == null || (typeof value === "string" && value.trim() === "") ? "—" : value;
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-stroke bg-white/60 px-4 py-3 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03]">
      <dt className={labelClasses}>{label}</dt>
      <dd className={cn(readOnlyValueClasses, "text-right")}>{display}</dd>
    </div>
  );
}

function FieldLabel({
  htmlFor,
  children,
  hint,
}: {
  htmlFor: string;
  children: React.ReactNode;
  hint?: React.ReactNode;
}) {
  return (
    <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
      <label htmlFor={htmlFor} className={labelClasses}>
        {children}
      </label>
      {hint ? (
        <span className="text-[11px] font-medium text-dark-5 dark:text-slate-500">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6 flex items-center gap-3">
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-stroke bg-gray-2 text-dark-5 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
        {icon}
      </div>
      <div className="min-w-0">
        <h3 className="text-lg font-bold tracking-tight text-dark dark:text-white">
          {title}
        </h3>
        <p className="text-sm text-dark-6 dark:text-slate-500">{description}</p>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const sessionUser = (session?.user ?? null) as SessionUser | null;
  const sessionEmail = (sessionUser?.email ?? "").trim();
  const normalizedEmail = sessionEmail.toLowerCase();
  const isStudent =
    sessionUser?.applicantRole === "student" ||
    normalizedEmail.endsWith("@student.uol.edu.pk") ||
    normalizedEmail.includes("student");
  const studentRecord = sessionUser?.studentRecord;

  const accountType = sessionUser?.adminRole
    ? sessionUser.adminRole.charAt(0).toUpperCase() +
      sessionUser.adminRole.slice(1)
    : isStudent
      ? "Student"
      : sessionUser?.applicantRole === "faculty"
        ? "Faculty / Staff"
        : "Account";

  const fullName =
    (isStudent
      ? studentRecord?.Name?.trim() || sessionUser?.name?.trim()
      : sessionUser?.name?.trim()) || "User";

  const sapDisplay = isStudent
    ? studentRecord?.SapNo?.trim() ||
      studentRecord?.RegNo?.trim() ||
      sessionUser?.sapId?.trim() ||
      "—"
    : sessionUser?.sapId?.trim()
      ? `SAP ${sessionUser.sapId.trim()}`
      : "—";

  const faculty = isStudent
    ? studentRecord?.FacultyName?.trim() ||
      studentRecord?.Faculty?.trim() ||
      "—"
    : "—";

  const department = isStudent
    ? studentRecord?.DeptName?.trim() || "—"
    : sessionUser?.facultyDepartment?.trim() || "—";

  const designation = isStudent
    ? studentRecord?.DegrTitle?.trim() || "—"
    : sessionUser?.facultyDesignation?.trim() || "—";

  const [profile, setProfile] = useState<EditableProfile>(EMPTY_PROFILE);
  const [original, setOriginal] = useState<EditableProfile>(EMPTY_PROFILE);
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionUser?.sapId) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/profile/me", { cache: "no-store" });
        const payload = (await response.json()) as {
          ok?: boolean;
          error?: string;
          profile?: FullProfile & { sapId: string };
        };
        if (!response.ok || !payload.ok || !payload.profile) {
          throw new Error(payload.error || "Failed to load profile.");
        }
        if (cancelled) return;
        const next: EditableProfile = {
          phone: payload.profile.phone ?? "",
          bio: payload.profile.bio ?? "",
          locale: payload.profile.locale ?? "",
          notificationEmail: payload.profile.notificationEmail ?? "",
        };
        setProfile(next);
        setOriginal(next);
        setAvatarUrl(payload.profile.avatarUrl ?? "");
      } catch (e) {
        if (cancelled) return;
        setError(
          e instanceof Error ? e.message : "Network error while loading profile.",
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [sessionUser?.sapId]);

  const isDirty = useMemo(
    () =>
      profile.phone !== original.phone ||
      profile.bio !== original.bio ||
      profile.locale !== original.locale ||
      profile.notificationEmail !== original.notificationEmail,
    [profile, original],
  );

  const updateField = useCallback(
    <K extends keyof EditableProfile>(key: K, value: EditableProfile[K]) => {
      setProfile((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const onPickAvatar = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please pick an image file.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error(
        `Avatar is too large (${(file.size / 1024 / 1024).toFixed(2)} MB). Max ${(
          MAX_AVATAR_BYTES /
          1024 /
          1024
        ).toFixed(1)} MB.`,
      );
      return;
    }
    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      const response = await fetch("/api/profile/me/avatar", {
        method: "POST",
        body: formData,
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        avatarUrl?: string;
      };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Failed to upload avatar.");
      }
      const nextUrl = payload.avatarUrl ?? "";
      setAvatarUrl(nextUrl);
      broadcastAvatarChange(nextUrl);
      toast.success("Avatar updated.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Network error while uploading.";
      toast.error(message);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const onRemoveAvatar = async () => {
    if (!avatarUrl || isUploadingAvatar) return;
    setIsUploadingAvatar(true);
    try {
      const response = await fetch("/api/profile/me/avatar", {
        method: "DELETE",
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
      };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "Failed to remove avatar.");
      }
      setAvatarUrl("");
      broadcastAvatarChange("");
      toast.success("Avatar removed.");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Network error while removing.";
      toast.error(message);
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const onSave = async () => {
    if (!isDirty || isSaving) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/profile/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        profile?: FullProfile & { sapId: string };
      };
      if (!response.ok || !payload.ok || !payload.profile) {
        throw new Error(payload.error || "Failed to save settings.");
      }
      const saved: EditableProfile = {
        phone: payload.profile.phone ?? "",
        bio: payload.profile.bio ?? "",
        locale: payload.profile.locale ?? "",
        notificationEmail: payload.profile.notificationEmail ?? "",
      };
      setProfile(saved);
      setOriginal(saved);
      setAvatarUrl(payload.profile.avatarUrl ?? "");
      toast.success("Settings saved.");
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Network error while saving settings.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const onCancel = () => {
    setProfile(original);
    setError(null);
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.1 },
    },
  };
  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
    },
  };

  const heroAvatar = avatarUrl.trim();

  return (
    <div className="min-h-screen bg-gray-2 font-sans text-dark selection:bg-indigo-500/30 dark:bg-slate-950 dark:text-white">
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute left-[-5%] top-[-10%] h-[800px] w-[800px] animate-pulse rounded-full bg-indigo-900/20 blur-[150px]" />
        <div className="absolute bottom-[-10%] right-[-5%] h-[600px] w-[600px] rounded-full bg-violet-900/15 blur-[120px]" />
        <div className="absolute left-[60%] top-[30%] h-[400px] w-[400px] rounded-full bg-blue-900/10 blur-[100px]" />
        <div className="absolute left-[20%] top-[60%] h-[300px] w-[300px] rounded-full bg-emerald-900/10 blur-[80px]" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <BreadcrumbBase pageName="Settings" />
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mt-6 grid gap-6"
        >
          {/* ─── Top Hero Bar ─── */}
          {/* ─── Top Hero Bar ─── */}
<motion.div variants={itemVariants}>
  <SpotlightCard className="p-6 lg:p-8">
    <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-6">
      {/* Avatar */}
      <motion.div
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="group relative flex h-20 w-20 flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-600 to-violet-600 text-3xl font-bold text-white shadow-lg shadow-indigo-500/25 ring-2 ring-white/10"
      >
        {heroAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroAvatar}
            alt="Avatar"
            className="h-full w-full object-cover"
          />
        ) : (
          fullName.charAt(0).toUpperCase()
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploadingAvatar}
          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
          title="Change avatar"
        >
          <svg
            className="h-5 w-5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
            />
          </svg>
        </button>
      </motion.div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1.5 min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-dark dark:text-white sm:text-3xl">
          {fullName}
        </h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-dark-6 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
            </svg>
            {sapDisplay}
          </span>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-600">|</span>
          <span className="inline-flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.375 3.375h.008v.008h-.008m-.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0Zm-.375 0h.008v.008h-.008m-.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0Z" />
            </svg>
            {department}
          </span>
          <span className="hidden sm:inline text-slate-300 dark:text-slate-600">|</span>
          <span className="inline-flex items-center gap-1.5 truncate">
            <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            {sessionEmail || "—"}
          </span>
        </div>
      </div>

      {/* Role Badge */}
      <div className="flex flex-shrink-0">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-400">
          <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
          {accountType}
        </span>
      </div>
    </div>
  </SpotlightCard>
</motion.div>

          {/* ─── Two-Column Layout ─── */}
          <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
            {/* ─── Left Sidebar ─── */}
            <motion.div variants={itemVariants} className="flex flex-col gap-6">
              {/* Quick Identity Summary */}
              <SpotlightCard className="p-5 lg:p-6">
                <SectionHeader
                  icon={
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  }
                  title="Identity"
                  description="Synced from institutional records."
                />
                <dl className="flex flex-col gap-2">
                  <ReadOnlyRow label="Full Name" value={<span className="text-[11px]">{fullName}</span>} />
                  <ReadOnlyRow label="Email" value={<span className="text-[11px]">{sessionEmail}</span>} />
                  <ReadOnlyRow label="SAP / Reg No" value={<span className="text-[11px]">{sapDisplay}</span>} />
                  <ReadOnlyRow label="Faculty" value={<span className="text-[11px]">{faculty}</span>} />
                  <ReadOnlyRow label="Department" value={<span className="text-[11px]">{department}</span>} />
                  <ReadOnlyRow
                    label={isStudent ? "Degree Title" : "Designation"}
                    value={<span className="text-[11px]">{designation}</span>}
                  />
                </dl>
              </SpotlightCard>

              {/* Navigation / Actions */}
              <SpotlightCard className="p-5 lg:p-6">
                <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-dark-6 dark:text-slate-500">
                  Quick Links
                </h3>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => router.push("/profile/full")}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-dark transition-colors hover:bg-gray-3 dark:text-slate-300 dark:hover:bg-white/5"
                  >
                    <svg
                      className="h-4 w-4 text-dark-5 dark:text-slate-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                      />
                    </svg>
                    View Full Profile
                  </button>
                  <button
                    onClick={() => router.push("/profile")}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-dark transition-colors hover:bg-gray-3 dark:text-slate-300 dark:hover:bg-white/5"
                  >
                    <svg
                      className="h-4 w-4 text-dark-5 dark:text-slate-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
                      />
                    </svg>
                    Back to Dashboard
                  </button>
                </div>
              </SpotlightCard>
            </motion.div>

            {/* ─── Right Main Content ─── */}
            <motion.div variants={itemVariants} className="flex flex-col gap-6">
              {/* Avatar Management */}
              <SpotlightCard className="p-6 lg:p-8">
                <SectionHeader
                  icon={
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 16.5V19a2 2 0 002 2h14a2 2 0 002-2v-2.5M16 12l-4-4-4 4m4-4v12"
                      />
                    </svg>
                  }
                  title="Profile Photo"
                  description={`PNG, JPG, GIF, or WebP. Up to ${(MAX_AVATAR_BYTES / 1024 / 1024).toFixed(1)} MB.`}
                />

                <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                  <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-stroke bg-gradient-to-br from-indigo-500 via-blue-600 to-violet-600 text-3xl font-bold text-white shadow-lg shadow-indigo-500/25 dark:border-white/10">
                    {heroAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={heroAvatar}
                        alt="Avatar preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      fullName.charAt(0).toUpperCase()
                    )}
                  </div>

                  <div className="flex flex-1 flex-col gap-3">
                    <p className="text-sm text-dark-6 dark:text-slate-400">
                      Upload a photo to help others recognize you. This image
                      will be shown across the platform.
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                        hidden
                        onChange={onPickAvatar}
                      />
                      <MagneticButton
                        variant="secondary"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingAvatar}
                        className="px-4 py-2 text-xs"
                      >
                        {isUploadingAvatar
                          ? "Uploading…"
                          : heroAvatar
                            ? "Replace Photo"
                            : "Upload Photo"}
                      </MagneticButton>
                      {heroAvatar && (
                        <MagneticButton
                          variant="danger"
                          onClick={() => void onRemoveAvatar()}
                          disabled={isUploadingAvatar}
                          className="px-4 py-2 text-xs"
                        >
                          Remove Photo
                        </MagneticButton>
                      )}
                    </div>
                  </div>
                </div>
              </SpotlightCard>

              {/* Editable Details */}
              <SpotlightCard className="p-6 lg:p-8">
                <SectionHeader
                  icon={
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  }
                  title="Profile Details"
                  description="Update your contact preferences and bio."
                />

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor="phone">Phone Number</FieldLabel>
                    <input
                      id="phone"
                      type="tel"
                      autoComplete="tel"
                      value={profile.phone}
                      onChange={(e) => updateField("phone", e.target.value)}
                      placeholder="+92 300 1234567"
                      className={inputClasses}
                    />
                  </div>

                  <div>
                    <FieldLabel htmlFor="notificationEmail">
                      Notification Email
                    </FieldLabel>
                    <input
                      id="notificationEmail"
                      type="email"
                      autoComplete="email"
                      value={profile.notificationEmail}
                      onChange={(e) =>
                        updateField("notificationEmail", e.target.value)
                      }
                      placeholder="alerts@example.com"
                      className={inputClasses}
                    />
                  </div>

                  <div>
                    <FieldLabel htmlFor="locale">Preferred Locale</FieldLabel>
                    <select
                      id="locale"
                      value={profile.locale}
                      onChange={(e) => updateField("locale", e.target.value)}
                      className={cn(inputClasses, "appearance-none pr-10")}
                    >
                      {LOCALE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <FieldLabel
                      htmlFor="bio"
                      hint={`${profile.bio.length.toLocaleString()} / 2,000`}
                    >
                      Bio
                    </FieldLabel>
                    <textarea
                      id="bio"
                      value={profile.bio}
                      onChange={(e) => updateField("bio", e.target.value)}
                      rows={5}
                      placeholder="Short description that appears alongside your submissions."
                      className={cn(inputClasses, "resize-y")}
                    />
                  </div>
                </div>
              </SpotlightCard>

              {/* Action Bar */}
              <SpotlightCard className="p-5 lg:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-dark-6 dark:text-slate-400">
                    {isLoading
                      ? "Loading your settings…"
                      : error
                        ? error
                        : isDirty
                          ? "You have unsaved changes."
                          : "All changes saved."}
                  </div>
                  <div className="flex flex-wrap gap-3 sm:justify-end">
                    <MagneticButton
                      variant="secondary"
                      onClick={onCancel}
                      disabled={!isDirty || isSaving}
                      className="px-4 py-2 text-xs"
                    >
                      Cancel
                    </MagneticButton>
                    <MagneticButton
                      onClick={() => void onSave()}
                      disabled={!isDirty || isSaving}
                      className="px-4 py-2 text-xs"
                    >
                      {isSaving ? "Saving…" : "Save Changes"}
                    </MagneticButton>
                  </div>
                </div>
              </SpotlightCard>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}