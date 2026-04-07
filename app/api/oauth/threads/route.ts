import { NextResponse } from "next/server";
import {
  buildThreadsAuthorizeUrl,
  createThreadsOauthState,
} from "@/lib/oauth/threads";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { buildAppUrl } from "@/utils/url";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(buildAppUrl("/login", request));
  }

  const requestUrl = new URL(request.url);
  const redirectTo = requestUrl.searchParams.get("redirectTo");
  const safeRedirectTo =
    redirectTo && redirectTo.startsWith("/") ? redirectTo : "/dashboard";
  const state = createThreadsOauthState();
  const response = NextResponse.redirect(buildThreadsAuthorizeUrl(state));

  response.cookies.set("threads_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
  response.cookies.set("threads_oauth_redirect_to", safeRedirectTo, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
