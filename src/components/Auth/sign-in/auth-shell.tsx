import type { ReactNode } from "react";

/**
 * Full-viewport auth backdrop + centered 12-col grid.
 * Slots keep DOM order mobile-friendly: brand -> card -> details.
 * Desktop: brand+details in col 7, card in col 5 spanning both rows.
 */
export function AuthShell({
  brand,
  card,
  details,
}: {
  brand: ReactNode;
  card: ReactNode;
  details: ReactNode;
}) {
  return (
    <main className="auth-bg relative min-h-dvh overflow-hidden text-white">
      {/* ambient layers */}
      <div
        aria-hidden
        className="auth-dotgrid pointer-events-none absolute inset-0"
      />
      <div
        aria-hidden
        className="auth-noise pointer-events-none absolute inset-0"
      />
      <div
        aria-hidden
        className="auth-glow pointer-events-none absolute -left-44 top-[-12%] h-[36rem] w-[36rem] rounded-full bg-[color:var(--auth-glow-indigo)] blur-[130px]"
      />
      <div
        aria-hidden
        className="auth-glow auth-glow-slow auth-glow-rev pointer-events-none absolute right-[-12%] top-[30%] h-[30rem] w-[30rem] rounded-full bg-[color:var(--auth-glow-sky)] blur-[120px]"
      />
      <div
        aria-hidden
        className="auth-glow auth-glow-slow pointer-events-none absolute bottom-[-18%] left-[30%] h-[28rem] w-[28rem] rounded-full bg-[color:var(--auth-glow-teal)] blur-[110px]"
      />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-7xl items-center px-6 py-12 lg:px-12">
        <div className="grid w-full gap-x-12 gap-y-10 lg:grid-cols-12 lg:gap-x-24">
          <div className="lg:col-span-7">{brand}</div>
          <div className="self-center lg:col-span-5 lg:row-span-2">{card}</div>
          <div className="lg:col-span-7">{details}</div>
        </div>
      </div>
    </main>
  );
}
