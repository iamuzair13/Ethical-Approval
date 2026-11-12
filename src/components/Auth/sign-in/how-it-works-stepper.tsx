import { BellRing, FileText, Users } from "lucide-react";

const STEPS = [
  {
    icon: FileText,
    title: "Submit Application",
    text: "Complete the ethics form with your research details and supporting documents.",
  },
  {
    icon: Users,
    title: "Department & IREB Review",
    text: "Your HOD and the IREB Chairman review the application before IREB consideration.",
  },
  {
    icon: BellRing,
    title: "Receive Decision",
    text: "Get notified on approval, rejection, or requests for revision — all tracked online.",
  },
] as const;

export function HowItWorksStepper() {
  return (
    <section aria-labelledby="how-it-works" className="max-w-xl">
      <p
        id="how-it-works"
        className="text-[13px] font-semibold tracking-[0.16em] text-blue-200/75"
      >
        How it works
      </p>
      <ol className="mt-6 space-y-6">
        {STEPS.map((step, i) => (
          <li key={step.title} className="relative flex gap-5">
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className="absolute left-5 top-11 -bottom-6 w-px bg-gradient-to-b from-white/30 via-white/15 to-transparent"
              />
            )}
            <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/25 bg-white/10 text-sm font-semibold text-white shadow-[0_0_0_5px_rgba(255,255,255,0.05)] backdrop-blur">
              {i + 1}
            </span>
            <div className="min-w-0 pt-0.5">
              <div className="flex items-center gap-2.5">
                <step.icon
                  aria-hidden
                  className="h-[18px] w-[18px] shrink-0 text-sky-300/80"
                />
                <h3 className="text-lg font-semibold text-white">
                  {step.title}
                </h3>
              </div>
              <p className="mt-1.5 text-[15px] leading-relaxed text-white/70">
                {step.text}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
