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
import { useEffect, useState } from "react";
import { LogOutIcon, SettingsIcon, UserIcon } from "./icons";

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

function UserAvatar({
  name,
  imageUrl,
  imageFailed,
  onImageError,
}: {
  name: string;
  imageUrl: string;
  imageFailed: boolean;
  onImageError: () => void;
}) {
  const shell =
    "size-12 shrink-0 overflow-hidden rounded-full border border-stroke dark:border-dark-3";

  if (imageUrl && !imageFailed) {
    return (
      <Image
        src={imageUrl}
        className={`${shell} object-cover object-center`}
        alt={`Avatar of ${name}`}
        role="presentation"
        width={96}
        height={96}
        onError={onImageError}
      />
    );
  }

  return (
    <div
      className={cn(
        shell,
        "flex items-center justify-center bg-gray-2 text-sm font-semibold uppercase tracking-tight text-dark dark:bg-dark-3 dark:text-white",
      )}
      aria-hidden
    >
      {initialsFromName(name)}
    </div>
  );
}

export function UserInfo() {
  const [isOpen, setIsOpen] = useState(false);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
  const { data: session, status } = useSession();

  const avatarUrl =
    typeof session?.user?.image === "string" ? session.user.image.trim() : "";

  useEffect(() => {
    setAvatarLoadFailed(false);
  }, [avatarUrl]);

  const USER = {
    name: session?.user?.name ?? "Guest",
    email: session?.user?.email ?? "",
  };

  if (status === "loading") {
    return (
      <div className="flex size-12 items-center justify-center rounded-full border border-stroke bg-gray-2 dark:border-dark-3 dark:bg-dark-2">
        <span className="inline-block size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <Dropdown isOpen={isOpen} setIsOpen={setIsOpen}>
      <DropdownTrigger className="rounded align-middle outline-none ring-primary ring-offset-2 focus-visible:ring-1 dark:ring-offset-gray-dark">
        <span className="sr-only">My Account</span>

        <figure className="flex items-center gap-3">
          <UserAvatar
            name={USER.name}
            imageUrl={avatarUrl}
            imageFailed={avatarLoadFailed}
            onImageError={() => setAvatarLoadFailed(true)}
          />
          <figcaption className="flex items-center gap-1 font-medium text-dark dark:text-dark-6 max-[1024px]:sr-only">
            <span>{USER.name}</span>

            <ChevronUpIcon
              aria-hidden
              className={cn(
                "rotate-180 transition-transform",
                isOpen && "rotate-0",
              )}
              strokeWidth={1.5}
            />
          </figcaption>
        </figure>
      </DropdownTrigger>

      <DropdownContent
        className="border border-stroke bg-white shadow-md dark:border-dark-3 dark:bg-gray-dark min-[230px]:min-w-[17.5rem]"
        align="end"
      >
        <h2 className="sr-only">User information</h2>

        <figure className="flex items-center gap-2.5 px-5 py-3.5">
          <UserAvatar
            name={USER.name}
            imageUrl={avatarUrl}
            imageFailed={avatarLoadFailed}
            onImageError={() => setAvatarLoadFailed(true)}
          />

          <figcaption className="space-y-1 text-base font-medium">
            <div className="mb-2 leading-none text-dark dark:text-white">
              {USER.name}
            </div>

            <div className="leading-none text-gray-6">{USER.email}</div>
          </figcaption>
        </figure>

        <hr className="border-[#E8E8E8] dark:border-dark-3" />

        <div className="p-2 text-base text-[#4B5563] dark:text-dark-6 [&>*]:cursor-pointer">
          <Link
            href={"/profile"}
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
          >
            <UserIcon />

            <span className="mr-auto text-base font-medium">View profile</span>
          </Link>

          <Link
            href={"/pages/settings"}
            onClick={() => setIsOpen(false)}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
          >
            <SettingsIcon />

            <span className="mr-auto text-base font-medium">
              Account Settings
            </span>
          </Link>
        </div>

        <hr className="border-[#E8E8E8] dark:border-dark-3" />

        <div className="p-2 text-base text-[#4B5563] dark:text-dark-6">
          <button
            type="button"
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[9px] hover:bg-gray-2 hover:text-dark dark:hover:bg-dark-3 dark:hover:text-white"
            onClick={() => {
              setIsOpen(false);
              void signOut({ callbackUrl: "/auth/sign-in" });
            }}
          >
            <LogOutIcon />

            <span className="text-base font-medium">Log out</span>
          </button>
        </div>
      </DropdownContent>
    </Dropdown>
  );
}
