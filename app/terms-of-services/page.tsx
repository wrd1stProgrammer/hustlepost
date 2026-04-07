import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTermsCopy } from "@/lib/i18n/legal";
import { buildPathWithSearch, getRequestLocale } from "@/lib/i18n/request";

export default async function TermsOfServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const params = await searchParams;
  const locale = await getRequestLocale(params.lang);
  const copy = getTermsCopy(locale);

  return (
    <main className="min-h-screen bg-[#F5F6F7] px-6 py-12 text-slate-900">
      <div className="mx-auto max-w-4xl space-y-8">
        <Link
          href={buildPathWithSearch("/", { lang: locale })}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          <ChevronLeft className="h-4 w-4" />
          {copy.backToHome}
        </Link>

        <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">{copy.title}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {copy.lastUpdatedLabel}: {copy.lastUpdatedDate}
          </p>

          <div className="mt-8 space-y-7">
            {copy.sections.map((section) => (
              <article key={section.title} className="space-y-2">
                <h2 className="text-lg font-semibold text-slate-900">{section.title}</h2>
                <p className="text-sm leading-7 text-slate-600">{section.body}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
