import { NextResponse } from "next/server";
import { ensureProfile } from "@/lib/db/accounts";
import { getLoginLocale } from "@/lib/i18n/login";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { buildAppUrl } from "@/utils/url";

function normalizeNextPath(path: string | null) {
  if (!path) {
    return "/onboarding";
  }

  if (!path.startsWith("/") || path.startsWith("//")) {
    return "/onboarding";
  }

  return path;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = normalizeNextPath(requestUrl.searchParams.get("next"));
  const locale = getLoginLocale(requestUrl.searchParams.get("lang"));

  if (!code) {
    return NextResponse.redirect(
      buildAppUrl(
        `/login?error=${encodeURIComponent("Missing Google OAuth code.")}&lang=${locale}`,
        request,
      ),
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      buildAppUrl(
        `/login?error=${encodeURIComponent(error.message)}&lang=${locale}`,
        request,
      ),
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await ensureProfile(user);
  }

  return NextResponse.redirect(buildAppUrl(nextPath, request));
}
