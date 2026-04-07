import { NextResponse } from "next/server";
import { LOCALE_COOKIE_NAME, resolveLocale } from "@/lib/i18n/locales";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const locale = resolveLocale(url.searchParams.get("locale"));
  const redirectTo = url.searchParams.get("redirectTo") || "/";

  const response = NextResponse.redirect(new URL(redirectTo, url));
  response.cookies.set(LOCALE_COOKIE_NAME, locale, {
    httpOnly: false,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}
