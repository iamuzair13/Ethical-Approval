import { Activity, Lock, ShieldCheck } from "lucide-react";

const ITEMS = [
  { icon: ShieldCheck, label: "SAP-verified access" },
  { icon: Lock, label: "Secure & confidential" },
  { icon: Activity, label: "Real-time status tracking" },
] as const;

export function TrustBadges() {
  return (
    <ul className="mt-10 flex flex-wrap gap-3">
      {ITEMS.map((item) => (
        <li
          key={item.label}
          className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.07] px-3.5 py-1.5 backdrop-blur"
        >
          <item.icon
            aria-hidden
            className="h-4 w-4 text-emerald-300"
            strokeWidth={1.8}
          />
          <span className="text-sm text-white/80">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}
