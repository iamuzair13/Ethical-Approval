"use client";

import {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import BreadcrumbBase from "@/components/Breadcrumbs/Breadcrumb";

/* ──────────────────────────── Types ──────────────────────────── */

interface Profile {
  name: string;
  regNo: string;
  department: string;
  email: string;
  degreeTitle: string;
  faculty: string;
  program: string;
}

interface RequestItem {
  id: string;
  applicationId: string;
  numericId: number;
  title: string;
  description: string;
  submittedOn: string;
  currentStage: string;
  isDraft: boolean;
}

type ProfileSubmissionApiRow = {
  id: number;
  application_id: string;
  current_status:
    | "draft"
    | "submitted"
    | "under_supervisor_review"
    | "supervisor_approved"
    | "supervisor_rejected"
    | "under_ireb_review"
    | "approved"
    | "rejected";
  submitted_at: string;
  title: string | null;
  objectives: string | null;
  supervisor_name?: string | null;
};

/* ──────────────────────────── Utilities ──────────────────────────── */

function mapStatusToStage(
  status: ProfileSubmissionApiRow["current_status"],
  supervisorName?: string | null,
): string {
  switch (status) {
    case "draft":
      return "Draft";
    case "submitted":
    case "under_supervisor_review":
      return supervisorName
        ? `Under Review by ${supervisorName}`
        : "Supervisor not Assigned";
    case "supervisor_approved":
      return "Approved by Supervisor";
    case "supervisor_rejected":
      return "Rejected by Supervisor";
    case "under_ireb_review":
      return "Under Review by IREB";
    case "approved":
      return "Approved by IREB";
    case "rejected":
      return "Rejected by IREB";
    default:
      return "Supervisor not Assigned";
  }
}

/* ──────────────────────────── Mouse Spotlight Hook ──────────────────────────── */

function useMouseSpotlight() {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  return { ref, position, handleMouseMove };
}

/* ──────────────────────────── Glass Card ──────────────────────────── */

const GlassCard = ({
  children,
  className,
  glowColor,
  interactive = true,
}: {
  children: React.ReactNode;
  className?: string;
  glowColor?: string;
  interactive?: boolean;
}) => {
  const { ref, position, handleMouseMove } = useMouseSpotlight();

  return (
    <motion.div
      ref={ref}
      onMouseMove={interactive ? handleMouseMove : undefined}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-white/10",
        "bg-slate-900/50 backdrop-blur-md",
        "dark:bg-slate-900/50 dark:border-white/10",
        "bg-white/80 border-slate-200/60",
        "transition-all duration-500",
        className
      )}
      whileHover={interactive ? { scale: 1.005 } : undefined}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Radial spotlight gradient following mouse */}
      {interactive && (
        <div
          className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${glowColor || "rgba(99,102,241,0.06)"}, transparent 40%)`,
          }}
        />
      )}
      {/* Ambient border glow on hover */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-700 group-hover:opacity-100",
          "bg-gradient-to-br from-white/5 via-transparent to-white/5"
        )}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
};

/* ──────────────────────────── Magnetic Button ──────────────────────────── */

const MagneticButton = ({
  children,
  onClick,
  variant = "primary",
  className,
  layoutId,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  className?: string;
  layoutId?: string;
}) => {
  const ref = useRef<HTMLButtonElement>(null);
  const [magnet, setMagnet] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * 0.15;
    const y = (e.clientY - rect.top - rect.height / 2) * 0.15;
    setMagnet({ x, y });
  };

  const handleMouseLeave = () => setMagnet({ x: 0, y: 0 });

  const variants = {
    primary:
      "bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20 hover:border-indigo-500/30",
    secondary:
      "bg-slate-800/50 border-white/10 text-slate-300 hover:bg-slate-700/50 hover:border-white/20",
    ghost:
      "bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5",
    danger:
      "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20 hover:border-red-500/30",
  };

  return (
    <motion.button
      ref={ref}
      layoutId={layoutId}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "relative inline-flex items-center gap-2 rounded-xl border px-4 py-2.5",
        "text-sm font-medium tracking-tight",
        "transition-colors duration-300",
        "backdrop-blur-sm",
        variants[variant],
        className
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      animate={{ x: magnet.x, y: magnet.y }}
      transition={{ type: "spring", stiffness: 350, damping: 15, mass: 0.5 }}
    >
      {children}
    </motion.button>
  );
};

/* ──────────────────────────── Animated Counter ──────────────────────────── */

const AnimatedCounter = ({ value }: { value: number }) => {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const duration = 1200;
    const start = performance.now();
    const from = display;

    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // easeOutCubic
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);
  }, [value]);

  return (
    <span className="tabular-nums tracking-tighter">{display}</span>
  );
};

/* ──────────────────────────── Stage Pill ──────────────────────────── */

const StagePill = ({
  stage,
  isDraft,
}: {
  stage: string;
  isDraft?: boolean;
}) => {
  if (isDraft) {
    return (
      <motion.span
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400 backdrop-blur-sm"
      >
        <motion.span
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="h-1.5 w-1.5 rounded-full bg-amber-400"
        />
        Draft
      </motion.span>
    );
  }

  const tone: Record<string, string> = {
    Approved:
      "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 [--dot:theme(colors.emerald.500)]",
    Rejected:
      "border-red-500/20 bg-red-500/10 text-red-400 [--dot:theme(colors.red.500)]",
    Review:
      "border-blue-500/20 bg-blue-500/10 text-blue-400 [--dot:theme(colors.blue.400)]",
    Default:
      "border-slate-500/20 bg-slate-500/10 text-slate-400 [--dot:theme(colors.slate.400)]",
  };

  const key = stage.includes("Approved")
    ? "Approved"
    : stage.includes("Rejected")
      ? "Rejected"
      : stage.includes("Review")
        ? "Review"
        : "Default";

  return (
    <motion.span
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-sm",
        tone[key]
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-[var(--dot)]" />
      {stage}
    </motion.span>
  );
};

/* ──────────────────────────── Info Row with Tooltip ──────────────────────────── */

const InfoRow = ({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <motion.div
      className="group relative flex flex-col gap-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.03] border-slate-200/60 bg-slate-50/50"
      whileHover={{ borderColor: "rgba(255,255,255,0.15)" }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <dt className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
        {label}
      </dt>
      <dd className="break-words text-sm font-semibold text-slate-900 dark:text-white">
        {value || "—"}
      </dd>

      {/* Hover-to-reveal tooltip */}
      <AnimatePresence>
        {detail && showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute -top-2 left-0 z-50 -translate-y-full rounded-lg border border-white/10 bg-slate-800/95 px-3 py-2 text-xs text-slate-300 shadow-xl backdrop-blur-md dark:bg-slate-800/95"
          >
            {detail}
            <div className="absolute bottom-0 left-6 h-2 w-2 translate-y-1/2 rotate-45 border-b border-r border-white/10 bg-slate-800/95 dark:bg-slate-800/95" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

/* ──────────────────────────── Skeleton Loader ──────────────────────────── */

const SkeletonPulse = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "relative overflow-hidden rounded-lg bg-slate-200 dark:bg-white/[0.04]",
      className
    )}
  >
    <motion.div
      className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent"
      animate={{ translateX: ["100%", "-100%"] }}
      transition={{
        repeat: Infinity,
        duration: 1.5,
        ease: "easeInOut",
        repeatDelay: 0.5,
      }}
    />
  </div>
);

const ActivitySkeleton = () => (
  <div className="grid gap-3">
    {[1, 2, 3].map((i) => (
      <div
        key={i}
        className="flex items-center gap-4 rounded-xl border border-slate-200/60 bg-white/40 p-4 backdrop-blur-sm dark:border-white/5 dark:bg-white/[0.02]"
      >
        <SkeletonPulse className="h-10 w-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <SkeletonPulse className="h-3 w-1/3 rounded" />
          <SkeletonPulse className="h-3 w-2/3 rounded" />
        </div>
        <SkeletonPulse className="h-6 w-20 rounded-full" />
      </div>
    ))}
  </div>
);

/* ──────────────────────────── Accordion Section ──────────────────────────── */

const AccordionSection = ({
  title,
  subtitle,
  icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <GlassCard className="p-6 lg:p-8">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="mb-6 flex w-full items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
            {icon}
          </div>
          <div className="text-left">
            <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
              {title}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-500">
              {subtitle}
            </p>
          </div>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="text-slate-400"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
};

/* ──────────────────────────── Main Component ──────────────────────────── */

export default function FullProfilePage() {
  const { data: session } = useSession();
  const router = useRouter();

  const sessionUser = session?.user as
    | {
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
      }
    | undefined
    | null;

  const sessionEmail = (sessionUser?.email ?? "").trim();
  const normalizedSessionEmail = sessionEmail.toLowerCase();
  const isStudentSession =
    sessionUser?.applicantRole === "student" ||
    normalizedSessionEmail.endsWith("@student.uol.edu.pk") ||
    normalizedSessionEmail.includes("student");

  const studentRecord = sessionUser?.studentRecord;

  const fallbackProfile: Profile = {
    name: "User",
    regNo: "—",
    department: "—",
    email: "",
    degreeTitle: "—",
    faculty: "—",
    program: "—",
  };

  const resolvedProfile: Profile =
    sessionUser && sessionEmail
      ? isStudentSession
        ? {
            name:
              studentRecord?.Name?.trim() ||
              sessionUser.name?.trim() ||
              fallbackProfile.name,
            regNo:
              studentRecord?.SapNo?.trim() ||
              studentRecord?.RegNo?.trim() ||
              sessionUser.sapId?.trim() ||
              fallbackProfile.regNo,
            department:
              studentRecord?.DeptName?.trim() || fallbackProfile.department,
            email: sessionEmail,
            degreeTitle:
              studentRecord?.DegrTitle?.trim() || fallbackProfile.degreeTitle,
            faculty:
              studentRecord?.FacultyName?.trim() ||
              studentRecord?.Faculty?.trim() ||
              fallbackProfile.faculty,
            program: studentRecord?.Program?.trim() || fallbackProfile.program,
          }
        : {
            name: sessionUser.name?.trim() || fallbackProfile.name,
            regNo: sessionUser.sapId?.trim()
              ? `SAP ${sessionUser.sapId.trim()}`
              : fallbackProfile.regNo,
            department:
              sessionUser.facultyDepartment?.trim() ||
              fallbackProfile.department,
            email: sessionEmail,
            degreeTitle:
              sessionUser.facultyDesignation?.trim() ||
              fallbackProfile.degreeTitle,
            faculty: fallbackProfile.faculty,
            program: fallbackProfile.program,
          }
      : fallbackProfile;

  const accountType = sessionUser?.adminRole
    ? sessionUser.adminRole.charAt(0).toUpperCase() +
      sessionUser.adminRole.slice(1)
    : isStudentSession
      ? "Student"
      : sessionUser?.applicantRole === "faculty"
        ? "Faculty / Staff"
        : "Account";

  const signInProvider =
    normalizedSessionEmail.endsWith("@uol.edu.pk") ||
    normalizedSessionEmail.endsWith("@student.uol.edu.pk")
      ? "Google (UOL)"
      : "Credentials";

  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "security">(
    "overview"
  );

  /* Submissions fetch */
  useEffect(() => {
    if (!sessionUser?.sapId) return;
    let cancelled = false;

    const loadSubmissions = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const response = await fetch("/api/profile/submissions", {
          cache: "no-store",
        });
        const payload = (await response.json()) as {
          ok?: boolean;
          error?: string;
          submissions?: ProfileSubmissionApiRow[];
        };

        if (!response.ok || !payload.ok) {
          throw new Error(payload.error || "Failed to load submissions.");
        }

        const mapped = (payload.submissions ?? []).map((row) => ({
          id: String(row.id),
          applicationId: row.application_id,
          numericId: row.id,
          title: row.title?.trim() || "Untitled submission",
          description: row.objectives?.trim() || "No objectives provided.",
          submittedOn: new Date(row.submitted_at).toLocaleDateString(),
          currentStage: mapStatusToStage(row.current_status, row.supervisor_name),
          isDraft: row.current_status === "draft",
        }));

        if (!cancelled) setRequests(mapped);
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Network error while loading submissions."
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void loadSubmissions();
    return () => {
      cancelled = true;
    };
  }, [sessionUser?.sapId]);

  const requestStats = useMemo(
    () =>
      requests.reduce(
        (acc, request) => {
          const stage = request.currentStage;
          if (stage.startsWith("Under Review by") && !stage.includes("IREB")) acc.inSupervisor += 1;
          else if (stage === "Under Review by IREB") acc.inEthical += 1;
          else if (stage.includes("Approved") || stage.includes("Rejected"))
            acc.completed += 1;
          return acc;
        },
        { inSupervisor: 0, inEthical: 0, completed: 0 }
      ),
    [requests]
  );

  const recentRequests = useMemo(() => requests.slice(0, 5), [requests]);

  /* Animation variants */
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.15 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 24, filter: "blur(10px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
    },
  };

  const bentoItemVariants: Variants = {
    hidden: { opacity: 0, scale: 0.95, filter: "blur(8px)" },
    visible: {
      opacity: 1,
      scale: 1,
      filter: "blur(0px)",
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
    },
  };

  /* Tab configuration for layout transitions */
  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "security" as const, label: "Security" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-indigo-500/30 dark:bg-slate-950 dark:text-white">
      {/* Premium font stack */}
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap");
        .font-sans {
          font-family: "Inter", "Geist", "Satoshi", system-ui, sans-serif;
        }
      `}</style>

      {/* Ambient mesh gradient background - static spots with subtle animation */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <motion.div
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute left-[-10%] top-[-10%] h-[900px] w-[900px] rounded-full bg-indigo-900/10 blur-[150px] dark:bg-indigo-900/20"
        />
        <motion.div
          animate={{
            x: [0, -20, 0],
            y: [0, 30, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute bottom-[-15%] right-[-10%] h-[700px] w-[700px] rounded-full bg-violet-900/8 blur-[130px] dark:bg-violet-900/15"
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute left-[50%] top-[40%] h-[500px] w-[500px] rounded-full bg-blue-900/5 blur-[100px] dark:bg-blue-900/10"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100/50 via-transparent to-transparent dark:from-slate-900/50" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1280px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <BreadcrumbBase pageName="Full Profile" />
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="mt-8 grid gap-6"
        >
          {/* ─────────────── HERO BENTO (spans full width) ─────────────── */}
          <motion.div variants={itemVariants}>
            <GlassCard className="p-8 lg:p-10" glowColor="rgba(99,102,241,0.08)">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-5">
                  <motion.div
                    whileHover={{ scale: 1.05, rotate: 2 }}
                    whileTap={{ scale: 0.95 }}
                    className="relative flex h-18 w-18 flex-shrink-0 cursor-pointer items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-600 to-violet-600 text-3xl font-bold text-white shadow-lg shadow-indigo-500/25 ring-2 ring-white/20"
                  >
                    {resolvedProfile.name?.charAt(0)?.toUpperCase() || "U"}
                    <div className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white bg-emerald-400 dark:border-slate-900" />
                  </motion.div>

                  <div className="space-y-3">
                    <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
                      {resolvedProfile.name}
                    </h1>

                    <div className="flex flex-wrap items-center gap-2">
                      <motion.span
                        whileHover={{ scale: 1.05 }}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 bg-white/60 px-3 py-1.5 text-sm text-slate-700 backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                      >
                        <svg
                          className="h-4 w-4 text-indigo-500 dark:text-indigo-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0m-5 8a2 2 0 100-4 2 2 0 000 4zm0 0c1.306 0 2.417.835 2.83 2M9 14a3.001 3.001 0 00-2.83 2M15 11h3m-3 4h2"
                          />
                        </svg>
                        {resolvedProfile.regNo}
                      </motion.span>

                      <motion.span
                        whileHover={{ scale: 1.05 }}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 bg-white/60 px-3 py-1.5 text-sm text-slate-700 backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
                      >
                        <svg
                          className="h-4 w-4 text-blue-500 dark:text-blue-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                          />
                        </svg>
                        {resolvedProfile.department}
                      </motion.span>

                      <motion.span
                        whileHover={{ scale: 1.05 }}
                        className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 bg-white/60 px-3 py-1.5 text-sm text-slate-500 backdrop-blur-sm dark:border-white/10 dark:bg-white/5 dark:text-slate-400"
                      >
                        <svg
                          className="h-4 w-4 text-slate-400 dark:text-slate-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        {resolvedProfile.email || "—"}
                      </motion.span>

                      <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1.5 text-sm font-semibold text-indigo-600 backdrop-blur-sm dark:text-indigo-400">
                        {accountType}
                      </span>
                    </div>
                  </div>
                </div>

                <MagneticButton
                  variant="secondary"
                  onClick={() => router.push("/profile")}
                  className="self-start"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                  Back to Dashboard
                </MagneticButton>
              </div>
            </GlassCard>
          </motion.div>

          {/* ─────────────── BENTO GRID: Stats + Info ─────────────── */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            {/* Stats cards - 3 columns on large */}
            <motion.div
              variants={bentoItemVariants}
              className="lg:col-span-8"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <GlassCard
                  className="p-6"
                  glowColor="rgba(245,158,11,0.1)"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="mb-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                        Under Review by Supervisor
                      </p>
                      <p className="text-4xl font-bold tabular-nums tracking-tighter text-slate-900 dark:text-white">
                        <AnimatedCounter value={requestStats.inSupervisor} />
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-500 dark:text-amber-400">
                      <svg
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard
                  className="p-6"
                  glowColor="rgba(99,102,241,0.1)"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="mb-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                        Under Review by IREB
                      </p>
                      <p className="text-4xl font-bold tabular-nums tracking-tighter text-slate-900 dark:text-white">
                        <AnimatedCounter value={requestStats.inEthical} />
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-500 dark:text-indigo-400">
                      <svg
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                  </div>
                </GlassCard>

                <GlassCard
                  className="p-6"
                  glowColor="rgba(16,185,129,0.1)"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="mb-1 text-sm font-medium text-slate-500 dark:text-slate-400">
                        Completed Decisions
                      </p>
                      <p className="text-4xl font-bold tabular-nums tracking-tighter text-slate-900 dark:text-white">
                        <AnimatedCounter value={requestStats.completed} />
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">
                      <svg
                        className="h-6 w-6"
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
                  </div>
                </GlassCard>
              </div>
            </motion.div>

            {/* Quick Info - spans 4 cols */}
            <motion.div variants={bentoItemVariants} className="lg:col-span-4">
              <GlassCard className="h-full p-6" glowColor="rgba(139,92,246,0.08)">
                <div className="flex h-full flex-col justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      Account Status
                    </p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                      Active
                    </p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">
                        Provider
                      </span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {signInProvider}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500 dark:text-slate-400">
                        Role
                      </span>
                      <span className="font-medium text-slate-700 dark:text-slate-300">
                        {accountType}
                      </span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          </div>

          {/* ─────────────── TABS WITH LAYOUT TRANSITIONS ─────────────── */}
          <motion.div variants={itemVariants}>
            <div className="mb-6 flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.03] border-slate-200/60 bg-slate-100/50">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="relative flex-1 rounded-lg py-2 text-sm font-medium tracking-tight transition-colors"
                >
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 rounded-lg bg-white shadow-sm dark:bg-slate-800"
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 30,
                      }}
                    />
                  )}
                  <span
                    className={cn(
                      "relative z-10",
                      activeTab === tab.id
                        ? "text-slate-900 dark:text-white"
                        : "text-slate-500 dark:text-slate-400"
                    )}
                  >
                    {tab.label}
                  </span>
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {activeTab === "overview" ? (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="grid gap-6"
                >
                  {/* Personal Info - Accordion */}
                  <AccordionSection
                    title="Personal Information"
                    subtitle="Read-only details from your account"
                    defaultOpen={true}
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
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    }
                  >
                    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <InfoRow
                        label="Full Name"
                        value={resolvedProfile.name}
                        detail="As registered in the university database"
                      />
                      <InfoRow
                        label="Role"
                        value={accountType}
                        detail="Determines your available actions"
                      />
                      <InfoRow
                        label="Email"
                        value={resolvedProfile.email}
                        detail="Primary contact address"
                      />
                      {isStudentSession ? (
                        <>
                          <InfoRow
                            label="SAP ID"
                            value={
                              studentRecord?.SapNo?.trim() ||
                              sessionUser?.sapId?.trim() ||
                              "—"
                            }
                            detail="University identification number"
                          />
                          <InfoRow
                            label="Registration No"
                            value={studentRecord?.RegNo?.trim() || "—"}
                            detail="Official registration number"
                          />
                          <InfoRow
                            label="Faculty"
                            value={resolvedProfile.faculty}
                            detail="Academic faculty affiliation"
                          />
                          <InfoRow
                            label="Department"
                            value={resolvedProfile.department}
                            detail="Your academic department"
                          />
                          <InfoRow
                            label="Degree Title"
                            value={resolvedProfile.degreeTitle}
                            detail="Program of study"
                          />
                          <InfoRow
                            label="Program"
                            value={resolvedProfile.program}
                            detail="Specialization track"
                          />
                        </>
                      ) : (
                        <>
                          <InfoRow
                            label="SAP ID"
                            value={sessionUser?.sapId?.trim() || "—"}
                            detail="Staff identification number"
                          />
                          <InfoRow
                            label="Department"
                            value={resolvedProfile.department}
                            detail="Working department"
                          />
                          <InfoRow
                            label="Designation"
                            value={resolvedProfile.degreeTitle}
                            detail="Current position"
                          />
                        </>
                      )}
                    </dl>
                  </AccordionSection>

                  {/* Recent Activity */}
                  <GlassCard className="p-6 lg:p-8" glowColor="rgba(59,130,246,0.06)">
                    <div className="mb-6 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
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
                              d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                            Recent Activity
                          </h3>
                          <p className="text-sm text-slate-500 dark:text-slate-500">
                            Your latest 5 submissions
                          </p>
                        </div>
                      </div>
                      <MagneticButton
                        variant="ghost"
                        onClick={() => router.push("/profile")}
                        className="px-3 py-1.5 text-xs"
                      >
                        View all
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13 7l5 5m0 0l-5 5m5-5H6"
                          />
                        </svg>
                      </MagneticButton>
                    </div>

                    {isLoading ? (
                      <ActivitySkeleton />
                    ) : recentRequests.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center py-12 text-center text-slate-500 dark:text-slate-500"
                      >
                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200/60 bg-slate-100/50 dark:border-white/10 dark:bg-white/5">
                          <svg
                            className="h-8 w-8 opacity-50"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={1.5}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                          </svg>
                        </div>
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                          No submissions yet.
                        </p>
                        <p className="mt-1 text-xs text-slate-400 dark:text-slate-600">
                          Open a new approval request from the dashboard to get
                          started.
                        </p>
                      </motion.div>
                    ) : (
                      <div className="grid gap-3">
                        {recentRequests.map((request, idx) => (
                          <motion.div
                            key={request.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              delay: idx * 0.08,
                              duration: 0.4,
                              ease: [0.22, 1, 0.36, 1],
                            }}
                            whileHover={{
                              scale: 1.01,
                              borderColor: "rgba(255,255,255,0.2)",
                            }}
                            className="group flex flex-col gap-3 rounded-xl border border-slate-200/60 bg-white/60 p-4 backdrop-blur-sm transition-colors hover:border-slate-300 hover:bg-white/80 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-white/20 dark:hover:bg-white/[0.05] sm:flex-row sm:items-center sm:justify-between"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center rounded-md border border-slate-200/60 bg-slate-100/50 px-2 py-0.5 font-mono text-xs font-bold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white">
                                  {request.applicationId}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-500">
                                  {request.submittedOn}
                                </span>
                              </div>
                              <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                {request.title}
                              </p>
                              <p className="mt-0.5 line-clamp-1 text-xs text-slate-500 opacity-0 transition-opacity group-hover:opacity-100 dark:text-slate-500">
                                {request.description}
                              </p>
                            </div>
                            <StagePill
                              stage={request.currentStage}
                              isDraft={request.isDraft}
                            />
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {loadError && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-500 dark:text-red-400"
                      >
                        <svg
                          className="h-4 w-4 flex-shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        {loadError}
                      </motion.div>
                    )}
                  </GlassCard>
                </motion.div>
              ) : (
                <motion.div
                  key="security"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <GlassCard className="p-6 lg:p-8" glowColor="rgba(239,68,68,0.06)">
                    <div className="mb-6 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
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
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
                          Account & Security
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-500">
                          Sign-in details for this session
                        </p>
                      </div>
                    </div>

                    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <InfoRow
                        label="Account Email"
                        value={resolvedProfile.email}
                        detail="Used for authentication"
                      />
                      <InfoRow
                        label="Account Type"
                        value={accountType}
                        detail="Determines permissions"
                      />
                      <InfoRow
                        label="Sign-in Provider"
                        value={signInProvider}
                        detail="Authentication method"
                      />
                    </dl>

                    <div className="mt-8 flex flex-wrap items-center gap-3">
                      <MagneticButton
                        variant="secondary"
                        onClick={() => router.push("/profile")}
                        className="px-4 py-2 text-xs"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M10 19l-7-7m0 0l7-7m-7 7h18"
                          />
                        </svg>
                        Back to Dashboard
                      </MagneticButton>
                      <MagneticButton
                        variant="danger"
                        onClick={() =>
                          void signOut({ callbackUrl: "/auth/sign-in" })
                        }
                        className="px-4 py-2 text-xs"
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                          />
                        </svg>
                        Sign out
                      </MagneticButton>
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}