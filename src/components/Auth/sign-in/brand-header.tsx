import Image from "next/image";
import Link from "next/link";

export function BrandHeader() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
      <Link
        href="/"
        aria-label="University of Lahore — home"
        className="shrink-0 rounded-lg outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-4 focus-visible:ring-offset-transparent"
      >
        <Image
          src="/images/logo/logo-white.png"
          alt="University of Lahore"
          width={142}
          height={68}
          priority
          className="h-[64px] w-auto sm:h-[68px]"
        />
      </Link>
      <span aria-hidden className="hidden h-10 w-px bg-white/25 sm:block" />
      <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-[13px] font-medium text-blue-50 backdrop-blur">
        <span
          aria-hidden
          className="inline-block size-1.5 rounded-full bg-emerald-400"
        />
        Institutional Review Ethics Board
      </span>
    </div>
  );
}
