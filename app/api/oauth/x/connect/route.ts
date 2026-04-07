import { NextResponse } from "next/server";
import { buildXAuthorizeUrl, createXOauthState } from "@/lib/oauth/x";
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

  const { state, codeVerifier, codeChallenge } = createXOauthState();
  const response = NextResponse.redirect(
    buildXAuthorizeUrl({ state, codeChallenge }),
  );

  response.cookies.set("x_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
  response.cookies.set("x_oauth_code_verifier", codeVerifier, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
