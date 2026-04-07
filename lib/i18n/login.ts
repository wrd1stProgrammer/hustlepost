import { DEFAULT_LOCALE, resolveLocale, type Locale } from "@/lib/i18n/locales";

export type LoginCopy = {
  brand: string;
  title: string;
  helperText: string;
  googleButton: string;
  googleCaption: string;
  googleSetupNote: string;
  dividerLabel: string;
  emailLabel: string;
  passwordLabel: string;
  signInButton: string;
  signUpButton: string;
};

const LOGIN_COPY: Record<Locale, LoginCopy> = {
  en: {
    brand: "Hustle-AI",
    title: "Sign in",
    helperText:
      "Use Google or email login. If Google sign-in fails, verify the callback URL and provider settings in Supabase and Google Cloud.",
    googleButton: "Continue with Google",
    googleCaption: "OAuth",
    googleSetupNote:
      "Google login redirects back through /auth/callback. Setup guide: docs/login-google-oauth.md",
    dividerLabel: "or continue with email",
    emailLabel: "Email",
    passwordLabel: "Password",
    signInButton: "Sign in",
    signUpButton: "Create account",
  },
  ko: {
    brand: "Hustle-AI",
    title: "로그인",
    helperText:
      "Google 또는 이메일로 로그인할 수 있습니다. Google 로그인 실패 시 Supabase/Google Cloud 콜백 설정을 확인하세요.",
    googleButton: "Google로 계속하기",
    googleCaption: "OAuth",
    googleSetupNote:
      "Google 로그인은 /auth/callback으로 돌아옵니다. 설정 가이드는 docs/login-google-oauth.md를 확인하세요.",
    dividerLabel: "또는 이메일로 계속",
    emailLabel: "이메일",
    passwordLabel: "비밀번호",
    signInButton: "로그인",
    signUpButton: "계정 만들기",
  },
};

export function getLoginLocale(value: string | null | undefined): Locale {
  return resolveLocale(value ?? DEFAULT_LOCALE);
}

export function getLoginCopy(value: string | null | undefined): LoginCopy {
  return LOGIN_COPY[getLoginLocale(value)];
}

export function buildLoginHref(
  locale: Locale,
  params: Record<string, string | undefined>,
) {
  const searchParams = new URLSearchParams();
  searchParams.set("lang", locale);

  for (const [key, value] of Object.entries(params)) {
    if (!value || key === "lang") {
      continue;
    }

    searchParams.set(key, value);
  }

  const query = searchParams.toString();
  return query ? `/login?${query}` : "/login";
}
