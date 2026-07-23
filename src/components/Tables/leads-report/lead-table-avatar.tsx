"use client";

import { cn } from "@/lib/utils";
import Image from "next/image";
import { useEffect, useState } from "react";

function initialsFromLeadName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) {
    const w = parts[0];
    return w.length <= 2 ? w.toUpperCase() : w.slice(0, 2).toUpperCase();
  }
  const a = parts[0][0] ?? "";
  const b = parts[parts.length - 1][0] ?? "";
  return `${a}${b}`.toUpperCase();
}

function normalizeLeadAvatarSrc(raw: string | null | undefined): string | null {
  const v = typeof raw === "string" ? raw.trim() : "";
  if (!v) return null;
  if (v.startsWith("/")) {
    const q = v.indexOf("?");
    return q === -1 ? v : v.slice(0, q);
  }
  return v;
}

export function LeadTableAvatar({
  name,
  avatar,
  onView,
}: {
  name: string;
  avatar: string | null;
  onView?: () => void;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const src = normalizeLeadAvatarSrc(avatar);

  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  const showImage = Boolean(src && !imageFailed);

  return (
    <figure className="flex items-center gap-2">
      {onView && (
        <button
          type="button"
          onClick={onView}
          aria-label={`View profile for ${name}`}
          title="View applicant profile"
          className="shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-blue-600 dark:hover:bg-gray-700 dark:hover:text-blue-400"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width={18}
            height={18}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      )}
      {showImage ? (
        <Image
          src={src!}
          alt=""
          width={32}
          height={32}
          className="size-8 shrink-0 rounded-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full",
            "bg-gradient-to-br from-blue-400 to-blue-600",
            "text-xs font-bold text-white",
          )}
          aria-hidden
        >
          {initialsFromLeadName(name)}
        </span>
      )}
      <figcaption className="truncate text-sm font-medium text-gray-900 dark:text-white">
        {name}
      </figcaption>
    </figure>
  );
}
