import type { Locale } from "@/lib/i18n/locales";
import type { LoginCopy } from "@/lib/i18n/login";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Command } from "lucide-react";
import Link from "next/link";

type LoginShellProps = {
  copy: LoginCopy;
  locale: Locale;
  localeRedirectTo: string;
  errorMessage?: string;
  signInWithGoogleAction: (formData: FormData) => Promise<void>;
  signInAction: (formData: FormData) => Promise<void>;
  signUpAction: (formData: FormData) => Promise<void>;
};

function GoogleGlyph() {
  return (
    <span
      aria-hidden="true"
      className="flex h-6 w-6 items-center justify-center rounded bg-slate-100 text-xs font-bold text-slate-900"
    >
      G
    </span>
  );
}

export function LoginShell({
  copy,
  locale,
  localeRedirectTo,
  errorMessage,
  signInWithGoogleAction,
  signInAction,
  signUpAction,
}: LoginShellProps) {
  return (
    <main className="min-h-screen bg-white text-slate-900 font-sans selection:bg-slate-900 selection:text-white flex flex-col">
      {/* Top Header */}
      <header className="absolute top-0 inset-x-0 p-6 flex justify-between items-center w-full z-10">
        <Link href="/" className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-1.5 bg-white shadow-sm hover:bg-slate-50 transition-colors">
          <Command className="h-4 w-4 text-slate-900" />
          <span className="text-[14px] font-extrabold tracking-tight text-slate-900">
            {copy.brand}
          </span>
        </Link>
        <div className="flex items-center bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-sm">
          <LanguageSwitcher currentLocale={locale} redirectTo={localeRedirectTo} />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6 py-24 relative">
        <div className="w-full max-w-[400px]">
          <section className="flex flex-col relative z-20">
             <h1 className="text-[2rem] sm:text-[2.25rem] font-extrabold tracking-tighter text-slate-900 text-center mb-3">
               {copy.title}
             </h1>
             <p className="text-[15px] font-medium text-slate-500 text-center mb-10">
               {copy.helperText}
             </p>

            {errorMessage ? (
              <div className="mb-8 rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 text-center">
                {errorMessage}
              </div>
            ) : null}

            <form action={signInWithGoogleAction} className="mb-8">
              <input type="hidden" name="lang" value={locale} />
              <input type="hidden" name="next" value="/dashboard" />
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-3 rounded-[14px] border border-slate-200 bg-white px-4 py-4 text-[15px] font-bold text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-900"
                title={copy.googleSetupNote}
              >
                <GoogleGlyph />
                <span>{copy.googleButton}</span>
              </button>
            </form>

            <div className="mb-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {copy.dividerLabel}
              </span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>

            <form action={signInAction} className="flex flex-col gap-6">
              <input type="hidden" name="lang" value={locale} />

              <label className="block relative">
                <span className="absolute -top-2.5 left-4 px-1 bg-white text-[11px] font-bold uppercase tracking-wide text-slate-400 z-10 transition-colors peer-focus:text-slate-900">
                  {copy.emailLabel}
                </span>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  className="peer w-full rounded-[14px] border border-slate-200 bg-white px-4 py-4 text-[15px] font-medium outline-none transition-all placeholder:text-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  placeholder="name@example.com"
                />
              </label>

              <label className="block relative">
                <span className="absolute -top-2.5 left-4 px-1 bg-white text-[11px] font-bold uppercase tracking-wide text-slate-400 z-10 transition-colors peer-focus:text-slate-900">
                  {copy.passwordLabel}
                </span>
                <input
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="peer w-full rounded-[14px] border border-slate-200 bg-white px-4 py-4 text-[15px] font-medium outline-none transition-all placeholder:text-slate-300 focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  placeholder="••••••••"
                />
              </label>

              <div className="flex flex-col gap-3 mt-4">
                <button className="w-full rounded-[14px] bg-slate-900 px-4 py-4 text-[15px] font-bold text-white transition-all hover:bg-slate-800 hover:-translate-y-0.5 shadow-md shadow-slate-900/10">
                  {copy.signInButton}
                </button>

                <button
                  formAction={signUpAction}
                  className="w-full rounded-[14px] border border-transparent bg-transparent px-4 py-4 text-[15px] font-bold text-slate-500 transition-all hover:text-slate-900"
                >
                  {copy.signUpButton}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
