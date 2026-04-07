"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ensureProfile } from "@/lib/db/accounts";
import { getLoginLocale } from "@/lib/i18n/login";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { getAppOrigin } from "@/utils/url";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNextPath(path: string) {
  if (!path.startsWith("/") || path.startsWith("//")) {
    return "/dashboard";
  }

  return path;
}

export async function signInWithGoogleAction(formData: FormData) {
  const locale = getLoginLocale(getFormValue(formData, "lang"));
  const nextPath = normalizeNextPath(
    getFormValue(formData, "next") || "/dashboard",
  );
  const appOrigin = getAppOrigin(await headers());
  const callbackUrl = new URL("/auth/callback", appOrigin);
  callbackUrl.searchParams.set("next", nextPath);
  callbackUrl.searchParams.set("lang", locale);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: callbackUrl.toString(),
    },
  });

  if (error || !data.url) {
    redirect(
      `/login?error=${encodeURIComponent(
        error?.message ?? "Google sign-in URL was not returned.",
      )}&lang=${locale}`,
    );
  }

  redirect(data.url);
}

export async function signInAction(formData: FormData) {
  const email = getFormValue(formData, "email");
  const password = getFormValue(formData, "password");
  const locale = getLoginLocale(getFormValue(formData, "lang"));
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(error.message)}&lang=${locale}`,
    );
  }

  if (data.user) {
    await ensureProfile(data.user);
  }

  redirect("/dashboard");
}

export async function signUpAction(formData: FormData) {
  const email = getFormValue(formData, "email");
  const password = getFormValue(formData, "password");
  const locale = getLoginLocale(getFormValue(formData, "lang"));
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(error.message)}&lang=${locale}`,
    );
  }

  if (data.user) {
    await ensureProfile(data.user);
  }

  redirect("/dashboard");
}
