import Link from "next/link";
import { authOptions } from "@/lib/auth-options";
import {
  ADMIN_ETHICS_FORM_CATALOG,
  getFormAudience,
  type AdminEthicsFormCatalogEntry,
} from "@/app/profile/_components/forms/form-registry";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { GraduationCap, Stethoscope } from "lucide-react";

export const metadata = { title: "Forms" };

type CatalogForm = AdminEthicsFormCatalogEntry & {
  domain: "medical" | "non-medical";
  formNumber: string;
  typeTitle: string;
  audienceLabel: string;
  description: string;
};

function describeForm(form: AdminEthicsFormCatalogEntry): CatalogForm {
  const domain =
    getFormAudience(form.id) === "medical" ? "medical" : "non-medical";
  // The official form number lives in the source document name
  // ("Form 3 Thesis form Medical Sciences.docx" → "3"), which is what
  // administrators recognise — navTitles renumber the faculty forms.
  const formNumber = form.label.match(/form\s*(\d+)/i)?.[1] ?? "·";
  const isThesis = form.applicationType === "thesis";
  const isFaculty = form.id.includes("faculty");
  return {
    ...form,
    domain,
    formNumber,
    typeTitle: isThesis ? "Thesis" : "Publication",
    audienceLabel: isFaculty ? "Faculty & staff" : "Student",
    description: isFaculty
      ? "Ethical approval for a faculty research publication."
      : isThesis
        ? "Ethical approval for a student thesis or research project."
        : "Ethical approval for a student research publication.",
  };
}

function DomainSection({
  title,
  caption,
  domain,
  forms,
}: {
  title: string;
  caption: string;
  domain: "medical" | "non-medical";
  forms: CatalogForm[];
}) {
  const Icon = domain === "medical" ? Stethoscope : GraduationCap;
  const accent =
    domain === "medical"
      ? {
          tile: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
          edge: "border-l-teal-500",
          eyebrow: "text-teal-600 dark:text-teal-400",
          ghost: "text-teal-500/10 group-hover:text-teal-500/[0.18]",
          hover:
            "hover:border-teal-500/60 hover:shadow-[0_10px_30px_-10px_rgba(20,184,166,0.45)] focus-visible:ring-teal-500 dark:hover:border-teal-500/50",
          cta: "group-hover:text-teal-600 dark:group-hover:text-teal-400",
        }
      : {
          tile: "bg-primary/10 text-primary",
          edge: "border-l-primary",
          eyebrow: "text-primary",
          ghost: "text-primary/10 group-hover:text-primary/[0.18]",
          hover:
            "hover:border-primary/60 hover:shadow-[0_10px_30px_-10px_rgba(87,80,241,0.45)] focus-visible:ring-primary dark:hover:border-primary/50",
          cta: "group-hover:text-primary",
        };

  return (
    <section className="overflow-hidden rounded-[10px] border border-stroke bg-white dark:border-dark-3 dark:bg-gray-dark">
      <header
        className={`flex items-center gap-3 border-l-4 bg-gray-2/60 px-5 py-4 dark:bg-white/[0.03] ${accent.edge}`}
      >
        <span
          className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${accent.tile}`}
        >
          <Icon className="size-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-dark dark:text-white">
            {title}
          </h3>
          <p className="text-xs text-dark-5">{caption}</p>
        </div>
        <span className="ml-auto shrink-0 rounded-full border border-stroke bg-white px-2.5 py-0.5 text-xs font-semibold tabular-nums text-dark dark:border-dark-3 dark:bg-dark-2 dark:text-white">
          {forms.length}
        </span>
      </header>

      <div className="grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
        {forms.map((form) => (
          <Link
            key={form.id}
            href={`/forms/${form.id}`}
            className={`group relative flex flex-col overflow-hidden rounded-xl border border-stroke p-5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:border-dark-3 dark:focus-visible:ring-offset-gray-dark ${accent.hover}`}
          >
            {/* Ghost form numeral — encodes the official document number */}
            <span
              className={`pointer-events-none absolute -bottom-4 -right-1 select-none text-[5.5rem] font-bold leading-none tracking-tighter transition-colors duration-200 ${accent.ghost}`}
              aria-hidden
            >
              {form.formNumber}
            </span>

            <span
              className={`font-mono text-[11px] font-semibold tracking-[0.18em] ${accent.eyebrow}`}
            >
              FORM {form.formNumber}
            </span>
            <span className="mt-4 text-2xl font-bold tracking-tight text-dark dark:text-white">
              {form.typeTitle}
            </span>
            <span className="mt-1.5 text-[11px] font-medium uppercase tracking-wide text-dark-5">
              {form.audienceLabel}
            </span>
            <span className="mt-3 text-xs leading-relaxed text-body dark:text-dark-6">
              {form.description}
            </span>
            <span
              className={`mt-5 text-xs font-semibold text-dark-5 transition-colors ${accent.cta}`}
            >
              Open preview
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default async function FormsCatalogPage() {
  const session = await getServerSession(authOptions);
  if (
    session?.user?.adminRole !== "administrator" &&
    session?.user?.adminRole !== "ireb"
  ) {
    redirect("/auth/sign-in?callbackUrl=/forms");
  }

  const forms = ADMIN_ETHICS_FORM_CATALOG.map(describeForm);
  const medical = forms.filter((f) => f.domain === "medical");
  const nonMedical = forms.filter((f) => f.domain === "non-medical");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-dark dark:text-white">
          Ethics Forms
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-body dark:text-dark-6">
          Preview the official ethics forms exactly as applicants complete them —
          nothing is validated or saved. Forms are grouped by the review track
          they belong to.
        </p>
      </div>

      <DomainSection
        title="Medical Sciences"
        caption="Sciences, medicine & dentistry, pharmacy, allied health"
        domain="medical"
        forms={medical}
      />
      <DomainSection
        title="Non-Medical Sciences"
        caption="Management, law, engineering, IT, languages, arts & social sciences"
        domain="non-medical"
        forms={nonMedical}
      />
    </div>
  );
}
