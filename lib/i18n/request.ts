import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME, resolveLocale, type Locale } from "@/lib/i18n/locales";

export async function getRequestLocale(
  explicitLocale?: string | null,
): Promise<Locale> {
  if (explicitLocale) {
    return resolveLocale(explicitLocale);
  }

  const cookieStore = await cookies();
  return resolveLocale(cookieStore.get(LOCALE_COOKIE_NAME)?.value ?? DEFAULT_LOCALE);
}

export function buildPathWithSearch(
  pathname: string,
  searchParams: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(searchParams)) {
    if (!value) {
      continue;
    }

    params.set(key, value);
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
