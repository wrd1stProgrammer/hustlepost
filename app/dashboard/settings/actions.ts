"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function appendQueryParam(pathname: string, key: string, value: string) {
  const url = pathname.startsWith("http")
    ? new URL(pathname)
    : new URL(pathname, "http://localhost");

  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}${url.hash}`;
}

function getSettingsRedirectTo(formData: FormData) {
  const redirectTo = getFormValue(formData, "redirectTo");
  if (!redirectTo) {
    return "/dashboard/settings?tab=settings";
  }

  return redirectTo;
}

function isMissingEmailPreferenceColumns(error: unknown) {
  if (!(error instanceof Error)) return false;
  return (
    error.message.includes("automation_emails_enabled") ||
    error.message.includes("post_failure_alert_emails_enabled")
  );
}

function hasValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function updateProfileDisplayNameAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const redirectTo = getSettingsRedirectTo(formData);
  const displayName = getFormValue(formData, "displayName");

  if (!displayName || displayName.length > 60) {
    redirect(
      appendQueryParam(redirectTo, "settings_error", "invalid_display_name"),
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    redirect(appendQueryParam(redirectTo, "settings_error", "profile_failed"));
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/settings");
  redirect(appendQueryParam(redirectTo, "settings_saved", "profile_saved"));
}

export async function updateEmailAddressAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const redirectTo = getSettingsRedirectTo(formData);
  const nextEmail = getFormValue(formData, "nextEmail").toLowerCase();

  if (!hasValidEmail(nextEmail)) {
    redirect(appendQueryParam(redirectTo, "settings_error", "invalid_email"));
  }

  const { error } = await supabase.auth.updateUser({
    email: nextEmail,
  });

  if (error) {
    redirect(appendQueryParam(redirectTo, "settings_error", "email_failed"));
  }

  revalidatePath("/dashboard/settings");
  redirect(appendQueryParam(redirectTo, "settings_saved", "email_requested"));
}

export async function updatePasswordAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const redirectTo = getSettingsRedirectTo(formData);
  const nextPassword = getFormValue(formData, "nextPassword");

  if (nextPassword.length < 8) {
    redirect(appendQueryParam(redirectTo, "settings_error", "invalid_password"));
  }

  const { error } = await supabase.auth.updateUser({
    password: nextPassword,
  });

  if (error) {
    redirect(appendQueryParam(redirectTo, "settings_error", "password_failed"));
  }

  redirect(appendQueryParam(redirectTo, "settings_saved", "password_saved"));
}

export async function sendResetPasswordLinkAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const redirectTo = getSettingsRedirectTo(formData);

  if (!user.email) {
    redirect(appendQueryParam(redirectTo, "settings_error", "reset_failed"));
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  const callbackBase = siteUrl ? siteUrl.replace(/\/+$/, "") : null;

  const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
    redirectTo: callbackBase ? `${callbackBase}/login` : undefined,
  });

  if (error) {
    redirect(appendQueryParam(redirectTo, "settings_error", "reset_failed"));
  }

  redirect(appendQueryParam(redirectTo, "settings_saved", "reset_sent"));
}

export async function updateEmailPreferencesAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const redirectTo = getSettingsRedirectTo(formData);
  const automationEmailsEnabled = formData.has("automationEmailsEnabled");
  const postFailureAlertsEnabled = formData.has("postFailureAlertsEnabled");

  const { error } = await supabase
    .from("profiles")
    .update({
      automation_emails_enabled: automationEmailsEnabled,
      post_failure_alert_emails_enabled: postFailureAlertsEnabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    redirect(
      appendQueryParam(
        redirectTo,
        "settings_error",
        isMissingEmailPreferenceColumns(error)
          ? "preferences_unavailable"
          : "preferences_failed",
      ),
    );
  }

  revalidatePath("/dashboard/settings");
  redirect(
    appendQueryParam(redirectTo, "settings_saved", "preferences_saved"),
  );
}

export async function signOutAllDevicesAction(formData: FormData) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const redirectTo = getSettingsRedirectTo(formData);
  const { error } = await supabase.auth.signOut({ scope: "global" });

  if (error) {
    redirect(appendQueryParam(redirectTo, "settings_error", "signout_failed"));
  }

  redirect("/login?signed_out_all=1");
}
