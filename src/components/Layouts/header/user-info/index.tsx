"use client";

import { ChevronUpIcon } from "@/assets/icons";
import {
  Dropdown,
  DropdownContent,
  DropdownTrigger,
} from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { LogOutIcon, SettingsIcon, UserIcon } from "./icons";
import { toast } from "sonner";

/* ──────────────────────────── Utilities ──────────────────────────── */

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    const w = parts[0];
    return w.length <= 2 ? w.toUpperCase() : `${w.slice(0, 2)}`.toUpperCase();
  }
  const a = parts[0][0];
  const b = parts[parts.length - 1][0];
  return `${a}${b}`.toUpperCase();
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

/* ──────────────────────────── Glass Card Base ──────────────────────────── */

const GlassSurface = ({
  children,
  className,
  interactive = true,
}: {
  children: React.ReactNode;
  className?: string;
  interactive?: boolean;
}) => {
  const { ref, position, handleMouseMove } = useMouseSpotlight();

  return (
    <div
      ref={ref}
      onMouseMove={interactive ? handleMouseMove : undefined}
      className={cn(
        "group relative overflow-hidden",
        "border border-white/10 bg-slate-900/50 backdrop-blur-md",
        "dark:border-white/10 dark:bg-slate-900/50",
        "bg-white/80 border-slate-200/60",
        className
      )}
    >
      {interactive && (
        <div
          className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, rgba(99,102,241,0.08), transparent 40%)`,
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
};

/* ──────────────────────────── Magnetic Menu Item ──────────────────────────── */

const MagneticMenuItem = ({
  children,
  onClick,
  href,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  className?: string;
}) => {
  const ref = useRef<HTMLButtonElement & HTMLAnchorElement>(null);
  const [magnet, setMagnet] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * 0.08;
    const y = (e.clientY - rect.top - rect.height / 2) * 0.08;
    setMagnet({ x, y });
  };

  const handleMouseLeave = () => setMagnet({ x: 0, y: 0 });

  const baseClasses = cn(
    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5",
    "text-sm font-medium tracking-tight",
    "transition-colors duration-300",
    "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    "dark:text-slate-400 dark:hover:bg-white/[0.06] dark:hover:text-white",
    className
  );

  const motionProps = {
    onMouseMove: handleMouseMove,
    onMouseLeave: handleMouseLeave,
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
    animate: { x: magnet.x, y: magnet.y },
    transition: { type: "spring" as const, stiffness: 400, damping: 20, mass: 0.4 },
  };

  if (href) {
    return (
      <motion.a
        ref={ref as React.RefObject<HTMLAnchorElement>}
        href={href}
        onClick={onClick}
        className={baseClasses}
        {...motionProps}
      >
        {children}
      </motion.a>
    );
  }

  return (
    <motion.button
      ref={ref as React.RefObject<HTMLButtonElement>}
      type="button"
      onClick={onClick}
      className={baseClasses}
      {...motionProps}
    >
      {children}
    </motion.button>
  );
};

/* ──────────────────────────── Animated Avatar ──────────────────────────── */

const UserAvatar = ({
  name,
  imageUrl,
  imageFailed,
  onImageError,
  size = "md",
}: {
  name: string;
  imageUrl: string;
  imageFailed: boolean;
  onImageError: () => void;
  size?: "sm" | "md" | "lg";
}) => {
  const sizeClasses = {
    sm: "size-9 text-xs",
    md: "size-12 text-sm",
    lg: "size-14 text-base",
  };

  const shell = cn(
    "shrink-0 overflow-hidden rounded-full",
    "border border-slate-200/60 dark:border-white/10",
    "ring-2 ring-white/50 dark:ring-white/10",
    sizeClasses[size]
  );

  if (imageUrl && !imageFailed) {
    return (
      <motion.div
        whileHover={{ scale: 1.08, rotate: 2 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 15 }}
      >
        <Image
          src={imageUrl}
          className={cn(shell, "object-cover object-center")}
          alt={`Avatar of ${name}`}
          role="presentation"
          width={96}
          height={96}
          onError={onImageError}
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        shell,
        "flex items-center justify-center",
        "bg-gradient-to-br from-indigo-500 via-blue-600 to-violet-600",
        "text-white font-bold uppercase tracking-tight shadow-lg shadow-indigo-500/20"
      )}
      aria-hidden
    >
      {initialsFromName(name)}
    </motion.div>
  );
};

/* ──────────────────────────── Skeleton Loader ──────────────────────────── */

const AvatarSkeleton = () => (
  <div className="relative flex size-12 items-center justify-center overflow-hidden rounded-full border border-slate-200/60 bg-slate-100 dark:border-white/10 dark:bg-white/[0.04]">
    <motion.div
      className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent dark:via-white/10"
      animate={{ translateX: ["100%", "-100%"] }}
      transition={{
        repeat: Infinity,
        duration: 1.5,
        ease: "easeInOut",
        repeatDelay: 0.5,
      }}
    />
    <div className="size-5 rounded-full border-2 border-slate-300 border-t-transparent dark:border-slate-600 dark:border-t-transparent" />
  </div>
);

/* ──────────────────────────── Status Indicator ──────────────────────────── */

const StatusDot = ({ status }: { status: "online" | "away" | "offline" }) => {
  const colors = {
    online: "bg-emerald-400 shadow-emerald-400/50",
    away: "bg-amber-400 shadow-amber-400/50",
    offline: "bg-slate-400 shadow-slate-400/30",
  };

  return (
    <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border-2 border-white bg-white dark:border-slate-900 dark:bg-slate-900">
      <span
        className={cn(
          "h-2.5 w-2.5 rounded-full shadow-lg",
          colors[status]
        )}
      />
    </span>
  );
};

/* ──────────────────────────── Main Component ──────────────────────────── */

const PROFILE_AVATAR_CHANGED_EVENT = "ireb:profile-avatar-changed";

export function UserInfo() {
  const [isOpen, setIsOpen] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const [profileAvatar, setProfileAvatar] = useState<string>("");
  const { data: session, status } = useSession();
  const viewAsActive = Boolean(session?.user?.viewAsActive);

  const sessionImage =
    typeof session?.user?.image === "string" ? session.user.image.trim() : "";

  // Prefer the user-uploaded avatar from /api/profile/me; fall back to the
  // OAuth-provided session image (e.g. Google profile picture).
  const avatarUrl = profileAvatar || sessionImage;

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatarUrl]);

  // Hydrate the avatar from the user_profiles row once the session is ready.
  useEffect(() => {
    if (status !== "authenticated") {
      setProfileAvatar("");
      return;
    }
    if (viewAsActive) {
      setProfileAvatar("");
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch("/api/profile/me", { cache: "no-store" });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          ok?: boolean;
          profile?: { avatarUrl?: string };
        };
        if (cancelled) return;
        if (payload?.ok && payload.profile) {
          setProfileAvatar(payload.profile.avatarUrl?.trim() ?? "");
        }
      } catch {
        // Ignore network errors — fallback chain handles it.
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [status, viewAsActive]);

  // Live updates when the user changes their avatar from the settings page.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      setProfileAvatar(typeof detail === "string" ? detail.trim() : "");
    };
    window.addEventListener(PROFILE_AVATAR_CHANGED_EVENT, handler);
    return () =>
      window.removeEventListener(PROFILE_AVATAR_CHANGED_EVENT, handler);
  }, []);

  const roleLabel = (() => {
    const adminRole = session?.user?.adminRole;
    if (adminRole === "administrator") return "Administrator";
    if (adminRole === "supervisor") return "Supervisor";
    if (adminRole === "ireb") return "IREB";
    return "User";
  })();

  const USER = {
    name: session?.user?.name ?? "Guest",
    email: session?.user?.email ?? "",
    role: roleLabel,
  };

  /* Dropdown animation variants */
  const dropdownVariants: Variants = {
    hidden: {
      opacity: 0,
      y: -8,
      scale: 0.96,
      filter: "blur(8px)",
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: {
        duration: 0.3,
        ease: [0.22, 1, 0.36, 1] as const,
        staggerChildren: 0.05,
        delayChildren: 0.05,
      },
    },
    exit: {
      opacity: 0,
      y: -8,
      scale: 0.96,
      filter: "blur(8px)",
      transition: { duration: 0.2, ease: "easeInOut" },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, x: -8 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.25 } },
  };

  if (status === "loading") {
    return <AvatarSkeleton />;
  }

  return (
    <Dropdown isOpen={isOpen} setIsOpen={setIsOpen}>
      <DropdownTrigger className="rounded-full align-middle outline-none ring-2 ring-indigo-500/0 ring-offset-2 transition-all duration-300 hover:ring-indigo-500/30 focus-visible:ring-indigo-500/50 dark:ring-offset-slate-900">
        <span className="sr-only">My Account</span>

        <figure className="flex items-center gap-3">
          <div className="relative">
            <UserAvatar
              name={USER.name}
              imageUrl={avatarUrl}
              imageFailed={avatarLoadFailed}
              onImageError={() => setAvatarLoadFailed(true)}
              size="md"
            />
            <StatusDot status="online" />
          </div>

          <figcaption className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300 max-[1024px]:sr-only">
            <span className="text-sm tracking-tight">{USER.name}</span>

            <motion.div
              animate={{ rotate: isOpen ? 0 : 180 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] as const }}
            >
              <ChevronUpIcon
                aria-hidden
                className="text-slate-400 dark:text-slate-500"
                strokeWidth={1.5}
              />
            </motion.div>
          </figcaption>
        </figure>
      </DropdownTrigger>

      <DropdownContent
        className="border-0 bg-transparent p-0 shadow-none"
        align="end"
      >
        <AnimatePresence>
          {isOpen && (
            <motion.div
              variants={dropdownVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <GlassSurface
                className="min-w-[18rem] rounded-2xl border border-slate-200/60 bg-white/95 shadow-2xl shadow-slate-900/10 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95 dark:shadow-black/40"
                interactive
              >
                <div className="p-2">
                  {/* User Header */}
                  <motion.figure
                    variants={itemVariants}
                    className="flex items-center gap-3.5 rounded-xl bg-gradient-to-r from-indigo-500/5 to-violet-500/5 px-4 py-3.5 dark:from-indigo-500/10 dark:to-violet-500/10"
                  >
                    <div className="relative">
                      <UserAvatar
                        name={USER.name}
                        imageUrl={avatarUrl}
                        imageFailed={avatarLoadFailed}
                        onImageError={() => setAvatarLoadFailed(true)}
                        size="lg"
                      />
                      <StatusDot status="online" />
                    </div>

                    <figcaption className="min-w-0 space-y-0.5">
                      <div className="truncate text-sm font-bold tracking-tight text-slate-900 dark:text-white">
                        {USER.name}
                      </div>
                      <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {USER.email}
                      </div>
                      <div className="mt-1 inline-flex items-center rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        {USER.role}
                      </div>
                    </figcaption>
                  </motion.figure>

                  {/* Divider */}
                  <motion.div
                    variants={itemVariants}
                    className="my-2 h-px bg-gradient-to-r from-transparent via-slate-200/80 to-transparent dark:via-white/10"
                  />

                  {/* Navigation */}
                  <motion.nav
                    variants={itemVariants}
                    className="space-y-0.5 p-1"
                    aria-label="User menu"
                  >
                    

                    <MagneticMenuItem
                      href="/pages/settings"
                      onClick={() => setIsOpen(false)}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/60 bg-slate-50 text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400">
                        <SettingsIcon className="size-4" />
                      </div>
                      <span className="mr-auto">Account Settings</span>
                      <kbd className="hidden rounded-md border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-500 sm:inline-block">
                        ⌘,
                      </kbd>
                    </MagneticMenuItem>
                  </motion.nav>

                  {/* Divider */}
                  <motion.div
                    variants={itemVariants}
                    className="my-2 h-px bg-gradient-to-r from-transparent via-slate-200/80 to-transparent dark:via-white/10"
                  />

                  {/* Sign Out */}
                  <motion.div variants={itemVariants} className="p-1">
                    <MagneticMenuItem
                      onClick={() => {
                        setIsOpen(false);
                        toast.success("Successfully logged out.");
                        void signOut({ callbackUrl: "/auth/sign-in" });
                      }}
                      className="text-red-600 hover:bg-red-500/5 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-red-200/60 bg-red-50 text-red-500 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
                        <LogOutIcon className="size-4" />
                      </div>
                      <span className="mr-auto">Log out</span>
                    </MagneticMenuItem>
                  </motion.div>

                  {/* Footer hint */}
                  <motion.div
                    variants={itemVariants}
                    className="mt-2 px-3 pb-1 pt-2 text-center text-[10px] font-medium tracking-wide text-slate-400 dark:text-slate-600"
                  >
                    Press{" "}
                    <kbd className="rounded border border-slate-200 bg-slate-100 px-1 py-0.5 font-sans text-[10px] dark:border-white/10 dark:bg-white/[0.04]">
                      esc
                    </kbd>{" "}
                    to close
                  </motion.div>
                </div>
              </GlassSurface>
            </motion.div>
          )}
        </AnimatePresence>
      </DropdownContent>
    </Dropdown>
  );
}