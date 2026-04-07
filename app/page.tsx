import { redirect } from "next/navigation";
import { LandingShell } from "@/components/landing-shell";
import { ensureProfile } from "@/lib/db/accounts";
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
    const { error } = await supabase.auth.exchangeCodeForSession(params.code);
    if (error) {
      redirect(
        buildPathWithSearch("/login", {
          lang: locale,
          error: error.message,
        }),
      );
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (params.code && user) {
    await ensureProfile(user);
    redirect(normalizeNextPath(params.next));
  }

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
