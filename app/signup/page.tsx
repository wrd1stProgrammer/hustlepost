import { redirect } from "next/navigation";
import { buildPathWithSearch, getRequestLocale } from "@/lib/i18n/request";
import { getLoginCopy } from "@/lib/i18n/login";
import { LoginShell } from "@/components/login-shell";
import { signInAction, signInWithGoogleAction, signUpAction } from "../login/actions";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; lang?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const locale = await getRequestLocale(params.lang);
  const copy = getLoginCopy(locale);
  const localeRedirectTo = buildPathWithSearch("/signup", params);

  return (
    <LoginShell
      copy={copy}
      locale={locale}
      localeRedirectTo={localeRedirectTo}
      errorMessage={params.error}
      signInWithGoogleAction={signInWithGoogleAction}
      signInAction={signInAction}
      signUpAction={signUpAction}
      mode="signup"
    />
  );
}
