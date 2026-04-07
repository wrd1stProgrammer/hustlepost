"use client";

import type { Locale } from "@/lib/i18n/locales";
import type { LoginCopy } from "@/lib/i18n/login";
import Image from "next/image";
import appIcon from "@/app/assets/icon/icon-192.png";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

type LoginShellProps = {
  copy: LoginCopy;
  locale: Locale;
  localeRedirectTo: string;
  errorMessage?: string;
  signInWithGoogleAction: (formData: FormData) => Promise<void>;
  signInAction: (formData: FormData) => Promise<void>;
  signUpAction: (formData: FormData) => Promise<void>;
  mode?: "login" | "signup";
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

function GoogleSubmitButton({ copy }: { copy: any }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="group flex w-full items-center justify-center gap-3 rounded-[18px] border border-slate-200 bg-white px-4 py-3.5 text-[15px] font-bold text-slate-700 transition-all hover:border-[#65C984] hover:bg-slate-50 hover:text-slate-900 shadow-sm cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
    >
      {pending ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : <GoogleGlyph />}
      <span>{pending ? "Connecting..." : copy.googleButton}</span>
    </button>
  );
}

function AuthSubmitButton({ copy, isLogin }: { copy: any; isLogin: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button 
      type="submit" 
      disabled={pending}
      className="w-full flex items-center justify-center gap-2 rounded-[18px] bg-[#11301F] px-4 py-4 text-[15px] font-bold text-white transition-all hover:bg-black hover:-translate-y-0.5 shadow-md shadow-[#11301F]/20 cursor-pointer disabled:opacity-70 disabled:hover:translate-y-0 disabled:cursor-not-allowed"
    >
      {pending && <Loader2 className="h-5 w-5 animate-spin" />}
      {isLogin ? copy.signInButton : copy.signUpButton}
    </button>
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
  mode = "login",
}: LoginShellProps) {
  const isLogin = mode === "login";

  return (
    <main className="min-h-screen bg-[#fafafa] text-slate-900 font-sans selection:bg-[#65C984] selection:text-white flex flex-col relative">
      {/* Top Header */}
      <header className="absolute top-0 inset-x-0 p-6 flex justify-between items-center w-full z-10">
        <Link href="/" className="flex items-center gap-2 px-3 py-1.5 transition-colors cursor-pointer group">
          <Image
             src={appIcon}
             alt="Hustle Post"
             width={32}
             height={32}
             className="rounded-md object-cover transition-transform group-hover:scale-105"
          />
          <span className="text-[17px] font-extrabold tracking-tight text-slate-900">
            {copy.brand}
          </span>
        </Link>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6 py-24 relative">
        <div className="w-full max-w-[420px]">
          <section className="flex flex-col relative z-20 bg-white p-8 sm:p-10 border border-slate-200/60 rounded-[32px] shadow-[0_30px_60px_-15px_rgba(15,23,42,0.05)]">
             <h1 className="text-[2rem] font-extrabold tracking-tighter text-slate-900 text-center mb-2">
               {isLogin ? copy.title : "Create an account"}
             </h1>
             <p className="text-[14px] font-medium text-slate-500 text-center mb-8">
               {isLogin ? copy.helperText : "Join the workspace to manage your drafts."}
             </p>

            {errorMessage ? (
              <div className="mb-8 rounded-[14px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 text-center">
                {errorMessage}
              </div>
            ) : null}

            <form action={signInWithGoogleAction} className="mb-8">
              <input type="hidden" name="lang" value={locale} />
              <input type="hidden" name="next" value="/dashboard" />
              <GoogleSubmitButton copy={copy} />
            </form>

            <div className="mb-8 flex items-center gap-4">
              <div className="h-px flex-1 bg-slate-100" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                {copy.dividerLabel}
              </span>
              <div className="h-px flex-1 bg-slate-100" />
            </div>

            <form action={isLogin ? signInAction : signUpAction} className="flex flex-col gap-5">
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
                <AuthSubmitButton copy={copy} isLogin={isLogin} />

                <div className="text-center mt-3 text-[14px] font-medium text-slate-500">
                  {isLogin ? (
                    <>
                      Don't have an account?{" "}
                      <Link href="/signup" className="text-slate-900 font-bold hover:underline cursor-pointer">
                        Sign up
                      </Link>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <Link href="/login" className="text-slate-900 font-bold hover:underline cursor-pointer">
                        Sign in
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}
