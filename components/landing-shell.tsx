"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ArrowRight, Sparkles, CheckCircle2, ChevronDown, Wand2, Calendar, MessageSquare, LayoutTemplate, BriefcaseIcon, AtSign, Clock, FileText, User } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { motion, Variants } from "framer-motion";
import threadIcon from "@/app/assets/icon/thread.png";
import appIcon from "@/app/assets/icon/icon-192.png";

export type LandingLocale = "en" | "ko";

export type LandingDictionary = {
  brand: {
    label: string;
    subtitle: string;
  };
  nav: {
    features: string;
    pricing: string;
    login: string;
    startFree: string;
    dashboard: string;
  };
  locale: {
    label: string;
    english: string;
    korean: string;
  };
  hero: {
    title: string;
    description: string;
    primaryCta: string;
    signedInPrimaryCta: string;
  };
  features: {
    badge: string;
    video1: {
      title: string;
      description: string;
      primaryCta: string;
      secondaryCta: string;
    };
    video2: {
      title: string;
      description: string;
      primaryCta: string;
      secondaryCta: string;
    };
    video3: {
      title: string;
      description: string;
      primaryCta: string;
      secondaryCta: string;
    };
  };
  howItWorks: {
    badge: string;
    title: string;
    titleHighlight: string;
    description: string;
    step1: string;
    step2: string;
    step3: string;
    step1Desc: string;
    step2Desc: string;
    step3Desc: string;
    account1: string;
    account2: string;
    account3: string;
    output1: string;
    output2: string;
    output3: string;
  };
  pricing: {
    title: string;
    description: string;
    monthly: string;
    starter: {
      name: string;
      price: string;
      features: string[];
    };
    pro: {
      name: string;
      price: string;
      highlight: string;
      features: string[];
    };
    agency: {
      name: string;
      price: string;
      features: string[];
    };
  };
  cta: {
    title: string;
    description: string;
    primaryCta: string;
  };
  footer: {
    termsOfServices: string;
    privacyPolicy: string;
    copyright: string;
  };
};

type LandingShellProps = {
  dictionary: LandingDictionary;
  signedIn: boolean;
  activeLocale: LandingLocale;
  localeRedirectTo: string;
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

export function LandingShell({
  dictionary,
  signedIn,
  activeLocale,
  localeRedirectTo,
}: LandingShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const primaryCtaHref = signedIn ? "/dashboard" : "/login";
  const pricingCtaHref = signedIn ? "/dashboard/settings" : "/login";

  return (
    <main className="min-h-dvh bg-[#FAFAFA] text-slate-900 font-sans selection:bg-slate-900 selection:text-white">
      {/* Navigation */}
      <header className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/50">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-4 sm:h-16 sm:px-6">
          <div className="flex items-center gap-2">
            <Image
              src={appIcon}
              alt="Hustle Post"
              width={32}
              height={32}
              className="rounded-md object-cover"
            />
            <span className="text-[15px] font-extrabold tracking-tight text-slate-900 sm:text-[17px]">
              {dictionary.brand.label}
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#features" className="hover:text-slate-900 transition-colors">
              {dictionary.nav.features}
            </a>
            <a href="#pricing" className="hover:text-slate-900 transition-colors">
              {dictionary.nav.pricing}
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center">
              <LanguageSwitcher
                currentLocale={activeLocale}
                redirectTo={localeRedirectTo}
              />
            </div>
            {!signedIn && (
              <Link href="/login" className="hidden md:block text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors">
                {dictionary.nav.login}
              </Link>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((value) => !value)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 md:hidden"
              aria-expanded={mobileMenuOpen}
              aria-label="Toggle navigation"
            >
              <span className="relative h-4 w-4">
                <span
                  className={`absolute left-0 top-0.5 h-0.5 w-4 rounded-full bg-current transition ${
                    mobileMenuOpen ? "translate-y-[6px] rotate-45" : ""
                  }`}
                />
                <span
                  className={`absolute left-0 top-[6.5px] h-0.5 w-4 rounded-full bg-current transition ${
                    mobileMenuOpen ? "opacity-0" : ""
                  }`}
                />
                <span
                  className={`absolute left-0 top-[12.5px] h-0.5 w-4 rounded-full bg-current transition ${
                    mobileMenuOpen ? "-translate-y-[6px] -rotate-45" : ""
                  }`}
                />
              </span>
            </button>
          </div>
        </div>
        {mobileMenuOpen ? (
          <div className="border-t border-slate-200/70 bg-white/95 px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur-md md:hidden">
            <div className="mx-auto flex max-w-[1280px] flex-col gap-2">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {dictionary.nav.features}
              </a>
              <a
                href="#pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="rounded-2xl px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {dictionary.nav.pricing}
              </a>
              <Link
                href={primaryCtaHref}
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {signedIn ? dictionary.nav.dashboard : dictionary.nav.startFree}
                <ArrowRight className="h-4 w-4" />
              </Link>
              {!signedIn ? (
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {dictionary.nav.login}
                </Link>
              ) : null}
            </div>
          </div>
        ) : null}
      </header>

      {/* Hero Section - Centered Typography & Effects */}
      <motion.section 
        initial="hidden" 
        animate="visible" 
        variants={staggerContainer}
        className="relative z-10 mx-auto flex max-w-[1280px] flex-col items-center px-4 pt-28 pb-20 text-center sm:px-6 sm:pt-40 sm:pb-32"
      >
        {/* Subtle Background Glow */}
        <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 h-[300px] w-[520px] rounded-full bg-gradient-to-br from-[#65C984]/20 via-[#8A5CF5]/10 to-transparent blur-[100px] -z-10 pointer-events-none sm:h-[400px] sm:w-[800px]" />
        
        <div className="max-w-[860px] z-10 flex flex-col items-center">
          <motion.div variants={fadeUp} className="mb-5 inline-flex cursor-default items-center gap-2 rounded-full border border-slate-200/50 bg-white/50 px-3.5 py-1.5 backdrop-blur-sm shadow-sm transition-transform hover:scale-105 hover:bg-white/80 sm:mb-6 sm:px-4">
            <Sparkles className="h-4 w-4 text-[#65C984]" />
            <span className="text-[13px] font-bold text-slate-700 tracking-wide uppercase">AI-Powered Publishing</span>
          </motion.div>
          
          <motion.h1 variants={fadeUp} className="text-[2.55rem] font-extrabold tracking-tighter text-slate-900 leading-[1.02] sm:text-6xl lg:text-[5.5rem] lg:leading-[1.0]">
            {dictionary.hero.title}
          </motion.h1>
          
          <motion.p variants={fadeUp} className="mt-6 max-w-[600px] text-[16px] leading-[1.65] text-slate-500 font-medium sm:mt-8 sm:text-[22px] sm:leading-[1.6]">
            {dictionary.hero.description}
          </motion.p>

          <motion.div variants={fadeUp} className="mt-9 flex w-full flex-col items-center justify-center gap-4 sm:mt-12 sm:w-auto sm:flex-row sm:gap-5">
            <Link
              href={primaryCtaHref}
              className="group relative inline-flex w-full items-center justify-center gap-3 overflow-hidden rounded-full bg-[#65C984] px-8 py-4 text-[16px] font-bold text-[#11301F] shadow-[0_8px_20px_-6px_rgba(101,201,132,0.4)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_15px_30px_-8px_rgba(101,201,132,0.5)] hover:bg-[#58B975] sm:w-auto sm:px-10 sm:text-[17px]"
            >
              <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-150%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(150%)]">
                <div className="relative h-full w-8 bg-white/30" />
              </div>
              <span className="relative z-10 flex items-center gap-2">
                {signedIn ? dictionary.hero.signedInPrimaryCta : dictionary.hero.primaryCta}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </span>
            </Link>
          </motion.div>
        </div>
      </motion.section>

      {/* How It Works - Left Text + Right Diagram */}
      <motion.section
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px" }}
        variants={fadeUp}
        className="mx-auto max-w-[1280px] px-4 py-16 sm:px-6 sm:py-24"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          
          {/* Left: Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-widest mb-6">
              <Sparkles className="h-4 w-4" />
              {dictionary.howItWorks.badge}
            </div>
            <h2 className="mb-5 text-3xl font-extrabold tracking-tight text-slate-900 leading-[1.08] sm:mb-6 sm:text-5xl">
              {dictionary.howItWorks.title}{" "}
              <span className="text-emerald-600">
                {dictionary.howItWorks.titleHighlight}
              </span>
            </h2>
            <p className="mb-8 max-w-lg text-[16px] font-medium leading-relaxed text-slate-500 sm:mb-10 sm:text-lg">
              {dictionary.howItWorks.description}
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href={primaryCtaHref}
                className="inline-flex items-center gap-2 rounded-full bg-[#65C984] px-7 py-3.5 text-sm font-bold text-[#11301F] transition-all hover:bg-[#58B975]"
              >
                {signedIn ? dictionary.hero.signedInPrimaryCta : dictionary.hero.primaryCta}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-7 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {dictionary.nav.features}
              </a>
            </div>
          </motion.div>
          
          {/* Right: Connection Diagram */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative flex min-h-[280px] items-center justify-center overflow-hidden rounded-[1.75rem] bg-[#F5F5F7] p-5 sm:min-h-[400px] sm:rounded-[2rem] sm:p-12">
              {/* SVG Connection Diagram */}
              <svg viewBox="0 0 480 380" className="w-full max-w-[320px] sm:max-w-[480px]" fill="none">
                {/* Connection lines from User to HustlePost */}
                <motion.line
                  x1="80" y1="180" x2="200" y2="180"
                  stroke="#D1D5DB" strokeWidth="1.5"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                />
                
                {/* Connection lines from HustlePost to outputs */}
                {[
                  { x2: 400, y2: 56 },
                  { x2: 400, y2: 128 },
                  { x2: 400, y2: 200 },
                  { x2: 400, y2: 272 },
                  { x2: 400, y2: 340 },
                ].map((line, i) => (
                  <motion.line
                    key={i}
                    x1="260" y1="180"
                    x2={line.x2} y2={line.y2}
                    stroke="#D1D5DB" strokeWidth="1.5"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.6 + i * 0.1 }}
                  />
                ))}
                
                {/* User node (left) */}
                <motion.g
                  initial={{ opacity: 0, scale: 0.5 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                >
                  <circle cx="80" cy="180" r="32" fill="white" stroke="#E5E7EB" strokeWidth="1.5" />
                  <g transform="translate(64, 164)">
                    <User className="text-slate-400" width={32} height={32} strokeWidth={1.5} />
                  </g>
                </motion.g>
                
                {/* HustlePost AI hub (center) */}
                <motion.g
                  initial={{ opacity: 0, scale: 0.5 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: 0.5 }}
                >
                  <circle cx="230" cy="180" r="36" fill="white" stroke="#E5E7EB" strokeWidth="1.5" />
                  <image
                    x={202}
                    y={152}
                    width={56}
                    height={56}
                    href={appIcon.src}
                    preserveAspectRatio="xMidYMid slice"
                  />
                </motion.g>

                {/* Output nodes (right side) */}
                {[
                  { cy: 56 },
                  { cy: 128 },
                  { cy: 200 },
                  { cy: 272 },
                  { cy: 340 },
                ].map((node, i) => {
                  return (
                    <motion.g
                      key={i}
                      initial={{ opacity: 0, scale: 0.5 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: 0.8 + i * 0.1 }}
                    >
                      <circle cx="400" cy={node.cy} r="28" fill="white" stroke="#E5E7EB" strokeWidth="1.5" />
                      <image
                         x={382} y={node.cy - 18}
                         width={36} height={36}
                         href={threadIcon.src}
                         preserveAspectRatio="xMidYMid slice"
                      />
                    </motion.g>
                  );
                })}

                {/* Animated pulse dots traveling along lines */}
                <motion.circle
                  r="4" fill="#10B981"
                  animate={{
                    cx: [80, 200],
                    cy: [180, 180],
                    opacity: [0, 1, 1, 0],
                  }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
                />
                {[56, 128, 200, 272, 340].map((targetY, i) => (
                  <motion.circle
                    key={i}
                    r="3" fill="#10B981"
                    animate={{
                      cx: [260, 400],
                      cy: [180, targetY],
                      opacity: [0, 1, 1, 0],
                    }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut', delay: 1.5 + i * 0.3 }}
                  />
                ))}
              </svg>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* Video Features Section - Zig-Zag Layout */}
      <section id="features" className="mx-auto max-w-[1280px] space-y-20 px-4 py-16 sm:space-y-32 sm:px-6 sm:py-24">
         {/* Video 1 - Text Left, Video Right */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="order-2 lg:order-1 relative">
               <div className="inline-flex items-center gap-2 text-emerald-600 text-[11px] font-bold uppercase tracking-widest mb-6 px-3 py-1.5 bg-emerald-50 rounded-full border border-emerald-100">
                  <Sparkles className="h-3.5 w-3.5" />
                  {dictionary.features.badge}
               </div>
               <h2 className="mb-5 text-3xl font-extrabold tracking-tight text-slate-900 leading-[1.08] sm:mb-6 sm:text-5xl">{dictionary.features.video1.title}</h2>
               <p className="mb-8 max-w-lg text-[16px] font-medium leading-relaxed text-slate-500 sm:mb-10 sm:text-lg">{dictionary.features.video1.description}</p>
               <div className="flex flex-wrap items-center gap-4">
                  <Link href={primaryCtaHref} className="inline-flex items-center gap-2 rounded-full bg-[#65C984] px-7 py-3.5 text-sm font-bold text-[#11301F] transition-all hover:bg-[#58B975] hover:-translate-y-0.5 shadow-md shadow-[#65C984]/20">{dictionary.features.video1.primaryCta} <ArrowRight className="h-4 w-4" /></Link>
                  <a href="#demo" className="inline-flex items-center rounded-full border border-slate-200 bg-white px-7 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">{dictionary.features.video1.secondaryCta}</a>
               </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="order-1 lg:order-2">
               <div className="relative flex w-full aspect-[4/3] items-center justify-center overflow-hidden rounded-[1.75rem] border border-slate-200/60 bg-white p-2.5 shadow-[0_30px_60px_-15px_rgba(15,23,42,0.05)] sm:rounded-[2.5rem] sm:p-3">
                 <div className="relative h-full w-full overflow-hidden rounded-[1.35rem] bg-slate-100 shadow-inner sm:rounded-[2rem]">
                    <video className="w-full h-full object-cover" autoPlay loop muted playsInline>
                       <source src="/video/f1.webm" type="video/webm" />
                       <source src="/video/f1m.mp4" type="video/mp4" />
                    </video>
                 </div>
               </div>
            </motion.div>
         </div>

         {/* Video 2 - Video Left, Text Right */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="order-1 lg:order-1">
               <div className="w-full aspect-[4/3] rounded-[2.5rem] p-3 bg-white border border-slate-200/60 shadow-[0_30px_60px_-15px_rgba(15,23,42,0.05)] overflow-hidden flex items-center justify-center relative">
                 <div className="w-full h-full rounded-[2rem] bg-slate-100 overflow-hidden relative shadow-inner">
                    <video className="w-full h-full object-cover" autoPlay loop muted playsInline>
                       <source src="/video/f2.webm" type="video/webm" />
                       <source src="/video/f2m.mp4" type="video/mp4" />
                    </video>
                 </div>
               </div>
            </motion.div>
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="order-2 lg:order-2 lg:pl-10 relative">
               <div className="inline-flex items-center gap-2 text-indigo-600 text-[11px] font-bold uppercase tracking-widest mb-6 px-3 py-1.5 bg-indigo-50 rounded-full border border-indigo-100">
                  <Calendar className="h-3.5 w-3.5" />
                  {dictionary.features.badge}
               </div>
               <h2 className="mb-5 text-3xl font-extrabold tracking-tight text-slate-900 leading-[1.08] sm:mb-6 sm:text-5xl">{dictionary.features.video2.title}</h2>
               <p className="mb-8 max-w-lg text-[16px] font-medium leading-relaxed text-slate-500 sm:mb-10 sm:text-lg">{dictionary.features.video2.description}</p>
               <div className="flex flex-wrap items-center gap-4">
                  <Link href={primaryCtaHref} className="inline-flex items-center gap-2 rounded-full bg-[#65C984] px-7 py-3.5 text-sm font-bold text-[#11301F] transition-all hover:bg-[#58B975] hover:-translate-y-0.5 shadow-md shadow-[#65C984]/20">{dictionary.features.video2.primaryCta} <ArrowRight className="h-4 w-4" /></Link>
                  <a href="#demo" className="inline-flex items-center rounded-full border border-slate-200 bg-white px-7 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">{dictionary.features.video2.secondaryCta}</a>
               </div>
            </motion.div>
         </div>

         {/* Video 3 - Text Left, Video Right */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="order-2 lg:order-1 relative">
               <div className="inline-flex items-center gap-2 text-blue-600 text-[11px] font-bold uppercase tracking-widest mb-6 px-3 py-1.5 bg-blue-50 rounded-full border border-blue-100">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {dictionary.features.badge}
               </div>
               <h2 className="mb-5 text-3xl font-extrabold tracking-tight text-slate-900 leading-[1.08] sm:mb-6 sm:text-5xl">{dictionary.features.video3.title}</h2>
               <p className="mb-8 max-w-lg text-[16px] font-medium leading-relaxed text-slate-500 sm:mb-10 sm:text-lg">{dictionary.features.video3.description}</p>
               <div className="flex flex-wrap items-center gap-4">
                  <Link href={primaryCtaHref} className="inline-flex items-center gap-2 rounded-full bg-[#65C984] px-7 py-3.5 text-sm font-bold text-[#11301F] transition-all hover:bg-[#58B975] hover:-translate-y-0.5 shadow-md shadow-[#65C984]/20">{dictionary.features.video3.primaryCta} <ArrowRight className="h-4 w-4" /></Link>
                  <a href="#demo" className="inline-flex items-center rounded-full border border-slate-200 bg-white px-7 py-3.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">{dictionary.features.video3.secondaryCta}</a>
               </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.7 }} className="order-1 lg:order-2">
               <div className="relative flex w-full aspect-[4/3] items-center justify-center overflow-hidden rounded-[1.75rem] border border-slate-200/60 bg-white p-2.5 shadow-[0_30px_60px_-15px_rgba(15,23,42,0.05)] sm:rounded-[2.5rem] sm:p-3">
                 <div className="relative h-full w-full overflow-hidden rounded-[1.35rem] bg-slate-100 shadow-inner sm:rounded-[2rem]">
                    <video className="w-full h-full object-cover" autoPlay loop muted playsInline>
                       <source src="/video/f3.webm" type="video/webm" />
                       <source src="/video/f3m.mp4" type="video/mp4" />
                    </video>
                 </div>
               </div>
            </motion.div>
         </div>
      </section>

      {/* Minimalist Pricing Section */}
      <section id="pricing" className="mx-auto mt-8 max-w-[1080px] border-t border-slate-200/50 px-4 py-20 sm:mt-12 sm:px-6 sm:py-32">
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={fadeUp}
          className="text-center mb-16"
        >
          <h2 className="mb-4 text-3xl font-extrabold tracking-tighter text-slate-900 sm:text-5xl">{dictionary.pricing.title}</h2>
          <p className="text-[16px] font-medium text-slate-500 sm:text-lg">{dictionary.pricing.description}</p>
        </motion.div>
        
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="grid grid-cols-1 items-stretch gap-5 md:grid-cols-3 sm:gap-8"
        >
           {/* Starter */}
           <motion.div variants={fadeUp} className="relative flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-colors group hover:border-slate-300 sm:p-10">
              <h3 className="text-xl font-bold text-slate-900 mb-2">{dictionary.pricing.starter.name}</h3>
              <div className="flex items-baseline gap-1 mb-8">
                 <span className="text-4xl font-extrabold tracking-tight text-slate-900">{dictionary.pricing.starter.price}</span>
                 <span className="text-slate-500 font-medium">{dictionary.pricing.monthly}</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                {dictionary.pricing.starter.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm font-medium text-slate-600">
                     <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 relative top-0.5" />
                     {f}
                  </li>
                ))}
              </ul>
              <Link href={pricingCtaHref} className="block w-full py-3.5 px-4 rounded-[14px] border border-slate-200 text-center font-bold text-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:bg-slate-50 hover:border-slate-300 transition-all">
                {dictionary.hero.primaryCta}
              </Link>
           </motion.div>

           {/* Pro */}
           <motion.div variants={fadeUp} className="relative flex flex-col rounded-3xl border border-emerald-200 bg-emerald-50/30 p-6 shadow-md transition-colors group hover:bg-emerald-50/50 sm:p-10">
              <div className="absolute top-0 right-6 transform -translate-y-1/2 sm:right-8">
                 <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-widest border border-emerald-200 shadow-sm">
                   <Sparkles className="w-3 h-3" />
                   {dictionary.pricing.pro.highlight}
                 </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">{dictionary.pricing.pro.name}</h3>
              <div className="flex items-baseline gap-1 mb-8">
                 <span className="text-4xl font-extrabold tracking-tight text-slate-900">{dictionary.pricing.pro.price}</span>
                 <span className="text-slate-500 font-medium">{dictionary.pricing.monthly}</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                {dictionary.pricing.pro.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm font-medium text-slate-900">
                     <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 relative top-0.5" />
                     {f}
                  </li>
                ))}
              </ul>
              <Link href={pricingCtaHref} className="block w-full py-3.5 px-4 rounded-[14px] bg-[#65C984] text-[#11301F] text-center font-bold hover:bg-[#58B975] transition-all shadow-[0_4px_14px_0_rgba(101,201,132,0.3)]">
                {dictionary.hero.primaryCta}
              </Link>
           </motion.div>

           {/* Agency */}
           <motion.div variants={fadeUp} className="relative flex flex-col rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-colors group hover:border-slate-300 sm:p-10">
              <h3 className="text-xl font-bold text-slate-900 mb-2">{dictionary.pricing.agency.name}</h3>
              <div className="flex items-baseline gap-1 mb-8">
                 <span className="text-4xl font-extrabold tracking-tight text-slate-900">{dictionary.pricing.agency.price}</span>
                 <span className="text-slate-500 font-medium">{dictionary.pricing.monthly}</span>
              </div>
              <ul className="space-y-4 mb-10 flex-1">
                {dictionary.pricing.agency.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm font-medium text-slate-600">
                     <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 relative top-0.5" />
                     {f}
                  </li>
                ))}
              </ul>
              <Link href={pricingCtaHref} className="block w-full py-3.5 px-4 rounded-[14px] border border-slate-200 text-center font-bold text-slate-900 shadow-[0_1px_2px_rgba(0,0,0,0.02)] hover:bg-slate-50 hover:border-slate-300 transition-all">
                {dictionary.hero.primaryCta}
              </Link>
           </motion.div>
        </motion.div>
      </section>

      {/* Minimal Bottom CTA */}
      <motion.section 
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-100px" }}
        variants={fadeUp}
        className="mx-auto max-w-[800px] px-4 pt-16 pb-24 text-center sm:px-6 sm:pt-24 sm:pb-48"
      >
         <h2 className="mb-5 text-3xl font-extrabold tracking-tighter text-slate-900 leading-[1.04] sm:mb-6 sm:text-5xl lg:text-[4rem]">
           {dictionary.cta.title}
         </h2>
         <p className="mb-8 px-1 text-[16px] font-medium text-slate-500 sm:mb-12 sm:px-4 sm:text-xl">
           {dictionary.cta.description}
         </p>
         <Link
           href={primaryCtaHref}
           className="inline-flex w-full items-center justify-center gap-3 rounded-full bg-slate-900 px-8 py-4 text-[16px] font-bold !text-white transition-all duration-300 hover:bg-slate-800 hover:-translate-y-1 shadow-[0_10px_30px_-10px_rgba(15,23,42,0.3)] active:scale-[0.98] active:translate-y-0 sm:w-auto sm:px-10 sm:py-5 sm:text-lg"
         >
           {dictionary.cta.primaryCta}
           <ArrowRight className="h-5 w-5" />
         </Link>
      </motion.section>

      <footer className="border-t border-slate-200/70 bg-white/70">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-3 px-4 py-5 text-center text-sm text-slate-500 sm:flex-row sm:px-6 sm:py-6 sm:text-left">
          <div className="flex flex-wrap items-center justify-center gap-4 font-medium sm:justify-start sm:gap-5">
            <Link
              href={`/terms-of-services?lang=${activeLocale}`}
              className="transition hover:text-slate-900"
            >
              {dictionary.footer.termsOfServices}
            </Link>
            <Link
              href={`/privacy-policy?lang=${activeLocale}`}
              className="transition hover:text-slate-900"
            >
              {dictionary.footer.privacyPolicy}
            </Link>
          </div>
          <p>{dictionary.footer.copyright}</p>
        </div>
      </footer>
    </main>
  );
}
