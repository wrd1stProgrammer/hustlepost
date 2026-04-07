import { redirect } from "next/navigation";
import { LandingShell } from "@/components/landing-shell";
import { getLandingCopy } from "@/lib/i18n/landing";
import { buildPathWithSearch, getRequestLocale } from "@/lib/i18n/request";
import { createSupabaseServerClient } from "@/utils/supabase/server";

function normalizeNextPath(path: string | undefined) {
  if (!path) {
    return "/dashboard";
  }

  if (!path.startsWith("/") || path.startsWith("//")) {
    return "/dashboard";
  }

  return path;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{
    lang?: string;
    code?: string;
    next?: string;
    error?: string;
    error_description?: string;
  }>;
}) {
  const params = await searchParams;
  const locale = await getRequestLocale(params.lang);
  const supabase = await createSupabaseServerClient();

  if (params.code) {
    redirect(
      buildPathWithSearch("/auth/callback", {
        code: params.code,
        next: normalizeNextPath(params.next),
        lang: locale,
      }),
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (params.error) {
    redirect(
      buildPathWithSearch("/login", {
        lang: locale,
        error: params.error_description ?? params.error,
      }),
    );
  }

  return (
    <LandingShell
      dictionary={getLandingCopy(locale)}
      signedIn={Boolean(user)}
      activeLocale={locale}
      localeRedirectTo={buildPathWithSearch("/", params)}
    />
  );
}
