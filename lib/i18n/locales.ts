export const LOCALES = ["en", "ko"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE_NAME = "hustle-locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ko: "한국어",
};

const INTL_LOCALE_BY_LOCALE: Record<Locale, string> = {
  en: "en-US",
  ko: "ko-KR",
};

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "en" || value === "ko";
}

export function resolveLocale(value: string | null | undefined): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function getIntlLocale(locale: Locale): string {
  return INTL_LOCALE_BY_LOCALE[locale];
}
