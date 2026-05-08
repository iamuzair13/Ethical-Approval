"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
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
  adminRole?: "administrator" | "dean" | "ireb";
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

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-stroke bg-white/60 px-4 py-3 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03]">
      <dt className={labelClasses}>{label}</dt>
      <dd className={readOnlyValueClasses}>{value || "—"}</dd>
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
          {/* Hero */}
          <motion.div variants={itemVariants}>
            <SpotlightCard className="p-8 lg:p-10">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-5">
                  <motion.div
                    whileHover={{ scale: 1.05, rotate: 2 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative flex h-16 w-16 flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-600 to-violet-600 text-2xl font-bold text-white shadow-lg shadow-indigo-500/25 ring-2 ring-white/10"
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
                  </motion.div>

                  <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-dark dark:text-white">
                      {fullName}
                    </h1>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-2 rounded-full border border-stroke bg-gray-2 px-3 py-1.5 text-sm text-dark dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                        {sapDisplay}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-stroke bg-gray-2 px-3 py-1.5 text-sm text-dark dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                        {department}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-stroke bg-gray-2 px-3 py-1.5 text-sm text-dark-6 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                        {sessionEmail || "—"}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1.5 text-sm font-semibold text-indigo-400">
                        {accountType}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 self-start">
                  <MagneticButton
                    variant="secondary"
                    onClick={() => router.push("/profile/full")}
                  >
                    View Full Profile
                  </MagneticButton>
                  <MagneticButton
                    variant="ghost"
                    onClick={() => router.push("/profile")}
                  >
                    Back to Dashboard
                  </MagneticButton>
                </div>
              </div>
            </SpotlightCard>
          </motion.div>

          {/* Identity (read-only) */}
          <motion.div variants={itemVariants}>
            <SpotlightCard className="p-6 lg:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-stroke bg-gray-2 text-dark-5 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
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
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-dark dark:text-white">
                    Identity
                  </h3>
                  <p className="text-sm text-dark-6 dark:text-slate-500">
                    Synced from your institutional record. Not editable here.
                  </p>
                </div>
              </div>
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <ReadOnlyRow label="Full Name" value={fullName} />
                <ReadOnlyRow label="Email" value={sessionEmail} />
                <ReadOnlyRow label="SAP / Reg No" value={sapDisplay} />
                <ReadOnlyRow label="Faculty" value={faculty} />
                <ReadOnlyRow label="Department" value={department} />
                <ReadOnlyRow
                  label={isStudent ? "Degree Title" : "Designation"}
                  value={designation}
                />
              </dl>
            </SpotlightCard>
          </motion.div>

          {/* Avatar */}
          <motion.div variants={itemVariants}>
            <SpotlightCard className="p-6 lg:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-stroke bg-gray-2 text-dark-5 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
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
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-dark dark:text-white">
                    Avatar
                  </h3>
                  <p className="text-sm text-dark-6 dark:text-slate-500">
                    PNG, JPG, GIF, or WebP. Up to{" "}
                    {(MAX_AVATAR_BYTES / 1024 / 1024).toFixed(1)} MB. Stored as
                    a file in your account.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
                <div className="flex h-32 w-32 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-stroke bg-gradient-to-br from-indigo-500 via-blue-600 to-violet-600 text-3xl font-bold text-white shadow-lg shadow-indigo-500/25 dark:border-white/10">
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
                    Pick a file from your device. The image is uploaded
                    immediately — no need to press Save.
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
                          ? "Replace image"
                          : "Upload image"}
                    </MagneticButton>
                    {heroAvatar && (
                      <MagneticButton
                        variant="danger"
                        onClick={() => void onRemoveAvatar()}
                        disabled={isUploadingAvatar}
                        className="px-4 py-2 text-xs"
                      >
                        Remove avatar
                      </MagneticButton>
                    )}
                  </div>
                </div>
              </div>
            </SpotlightCard>
          </motion.div>

          {/* Editable details */}
          <motion.div variants={itemVariants}>
            <SpotlightCard className="p-6 lg:p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-stroke bg-gray-2 text-dark-5 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
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
                </div>
                <div>
                  <h3 className="text-lg font-bold tracking-tight text-dark dark:text-white">
                    Profile Details
                  </h3>
                  <p className="text-sm text-dark-6 dark:text-slate-500">
                    These fields are editable and saved to your account.
                  </p>
                </div>
              </div>

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
          </motion.div>

          {/* Action bar */}
          <motion.div variants={itemVariants}>
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
        </motion.div>
      </div>
    </div>
  );
}
