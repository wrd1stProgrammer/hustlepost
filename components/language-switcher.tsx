import Link from "next/link";
import { LOCALE_LABELS, LOCALES, type Locale } from "@/lib/i18n/locales";

type LanguageSwitcherProps = {
  currentLocale: Locale;
  redirectTo: string;
  tone?: "light" | "dark";
};

export function LanguageSwitcher({
  currentLocale,
  redirectTo,
  tone = "light",
}: LanguageSwitcherProps) {
  const wrapperClasses =
    tone === "dark"
      ? "border border-white/10 bg-white/10 text-slate-200"
      : "border border-slate-200 bg-white/80 text-slate-600 shadow-sm";

  return (
    <div
      className={`inline-flex rounded-full p-1 text-xs font-medium ${wrapperClasses}`}
    >
      {LOCALES.map((locale) => {
        const active = locale === currentLocale;

        return (
          <a
            key={locale}
            href={`/api/locale?locale=${locale}&redirectTo=${encodeURIComponent(redirectTo)}`}
            className={`rounded-full px-3 py-1.5 transition ${
              active
                ? "bg-slate-950 text-white"
                : tone === "dark"
                  ? "text-slate-200 hover:bg-white/15 hover:text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {LOCALE_LABELS[locale]}
          </a>
        );
      })}
    </div>
  );
}
