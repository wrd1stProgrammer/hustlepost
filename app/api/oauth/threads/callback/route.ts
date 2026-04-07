import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  ensureProfile,
  upsertConnectedAccount,
  upsertOauthToken,
} from "@/lib/db/accounts";
import {
  exchangeThreadsCode,
  exchangeThreadsLongLivedToken,
  fetchThreadsMe,
  getThreadsScopes,
} from "@/lib/oauth/threads";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { buildAppUrl } from "@/utils/url";

export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(buildAppUrl("/login", request));
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const storedState = cookieStore.get("threads_oauth_state")?.value;
  const redirectCookie = cookieStore.get("threads_oauth_redirect_to")?.value;
  const redirectPath =
    redirectCookie && redirectCookie.startsWith("/")
      ? redirectCookie
      : "/dashboard";
  const buildRedirect = (path: string, params?: Record<string, string>) => {
    const url = buildAppUrl(path, request);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    return url;
  };

  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.redirect(
      buildRedirect(redirectPath, { error: "threads_oauth_state" }),
    );
  }

  try {
    await ensureProfile(user);
    const shortLivedToken = await exchangeThreadsCode(code);
    const longLivedToken = await exchangeThreadsLongLivedToken(
      shortLivedToken.access_token,
    );
    const me = await fetchThreadsMe(longLivedToken.access_token);

    const account = await upsertConnectedAccount({
      userId: user.id,
      platform: "threads",
      platformUserId: me.id,
      username: me.username ?? null,
      displayName: me.name ?? me.username ?? null,
      avatarUrl: me.threads_profile_picture_url ?? null,
    });

    await upsertOauthToken({
      connectedAccountId: account.id,
      platform: "threads",
      accessToken: longLivedToken.access_token,
      scopes: getThreadsScopes(),
      tokenType: longLivedToken.token_type ?? null,
      expiresAt: longLivedToken.expires_in
        ? new Date(Date.now() + longLivedToken.expires_in * 1000).toISOString()
        : null,
      metadata: {
        short_lived_user_id: shortLivedToken.user_id ?? null,
        raw_user: me,
      },
    });

    const response = NextResponse.redirect(
      buildRedirect(redirectPath, { connected: "threads" }),
    );
    response.cookies.delete("threads_oauth_state");
    response.cookies.delete("threads_oauth_redirect_to");
    return response;
  } catch {
    const response = NextResponse.redirect(
      buildRedirect(redirectPath, { error: "threads_oauth_callback" }),
    );
    response.cookies.delete("threads_oauth_state");
    response.cookies.delete("threads_oauth_redirect_to");
    return response;
  }
}
