import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  ensureProfile,
  upsertConnectedAccount,
  upsertOauthToken,
} from "@/lib/db/accounts";
import { exchangeXCode, fetchXMe } from "@/lib/oauth/x";
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
  const storedState = cookieStore.get("x_oauth_state")?.value;
  const codeVerifier = cookieStore.get("x_oauth_code_verifier")?.value;

  if (!code || !state || !storedState || !codeVerifier || state !== storedState) {
    return NextResponse.redirect(
      buildAppUrl("/dashboard?error=x_oauth_state", request),
    );
  }

  try {
    await ensureProfile(user);
    const tokens = await exchangeXCode({ code, codeVerifier });
    const me = await fetchXMe(tokens.access_token);

    const account = await upsertConnectedAccount({
      userId: user.id,
      platform: "x",
      platformUserId: me.data.id,
      username: me.data.username,
      displayName: me.data.name,
    });

    await upsertOauthToken({
      connectedAccountId: account.id,
      platform: "x",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      tokenType: tokens.token_type ?? null,
      scopes: tokens.scope ? tokens.scope.split(" ") : [],
      expiresAt: tokens.expires_in
        ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
        : null,
      metadata: { raw_user: me.data },
    });

    const response = NextResponse.redirect(
      buildAppUrl("/dashboard?connected=x", request),
    );
    response.cookies.delete("x_oauth_state");
    response.cookies.delete("x_oauth_code_verifier");
    return response;
  } catch {
    return NextResponse.redirect(
      buildAppUrl("/dashboard?error=x_oauth_callback", request),
    );
  }
}
