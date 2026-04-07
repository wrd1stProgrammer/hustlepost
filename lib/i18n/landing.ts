import type { LandingDictionary } from "@/components/landing-shell";
import type { Locale } from "@/lib/i18n/locales";

const LANDING_COPY: Record<Locale, LandingDictionary> = {
  en: {
    brand: {
      label: "HustlePost",
      subtitle: "Trend Analysis AI",
    },
    nav: {
      features: "Features",
      pricing: "Pricing",
      login: "Login",
      startFree: "Start for free",
      dashboard: "Dashboard",
    },
    locale: {
      label: "Language",
      english: "English",
      korean: "Korean",
    },
    hero: {
      title: "Viral Threads Posts, Now as Easy as Filling in the Blanks.",
      description: "Just enter your target keyword and brand voice. Our Trend Analysis AI generates Informational, Engagement, and Product-led drafts in 10 seconds and queues them up.",
      primaryCta: "Start your free trial",
      signedInPrimaryCta: "Open dashboard",
    },
    features: {
      badge: "CORE FEATURES",
      video1: {
        title: "Custom AI Draft Generation",
        description: "Generate Informational, Engagement, and Product-led drafts effortlessly using our tailored AI engine.",
        primaryCta: "Start generating",
        secondaryCta: "See how it works",
      },
      video2: {
        title: "Schedule Posts Effortlessly",
        description: "Plan your content strategy ahead of time. Create a custom queue and let the system publish automatically at your desired dates and times.",
        primaryCta: "Start scheduling",
        secondaryCta: "View demo",
      },
      video3: {
        title: "Manage Comments Efficiently",
        description: "View all your posted content and manage comments in one centralized hub. Stay on top of interactions without constantly checking the app.",
        primaryCta: "Get started",
        secondaryCta: "View features",
      },
    },
    howItWorks: {
      badge: "How It Works",
      title: "From Keywords to",
      titleHighlight: "Smart Drafts",
      description: "Connect your Threads accounts. Our AI analyzes your keywords and brand voice to generate original, high-performing drafts — then schedules them automatically.",
      step1: "Connect Accounts",
      step2: "AI Smart Drafts",
      step3: "Content Calendar",
      step1Desc: "Link your Threads accounts and set custom keywords and personas.",
      step2Desc: "Creative Generation Engine analyzes your inputs and crafts original, optimized drafts.",
      step3Desc: "Drafts flow into your content calendar and get published on schedule.",
      account1: "@brand_official",
      account2: "@personal_growth",
      account3: "@side_hustle",
      output1: "Informational Type",
      output2: "Engagement Type",
      output3: "Product-led Type",
    },
    pricing: {
      title: "Simple Pricing",
      monthly: "/mo",
      starter: {
        name: "Starter",
        price: "$9",
        features: ["100 AI Posts", "1 Account"],
      },
      pro: {
        name: "Pro",
        price: "$39",
        highlight: "Most Popular",
        features: ["500 AI Posts", "3 Accounts", "Smart Queue"],
      },
      agency: {
        name: "Agency",
        price: "$59",
        features: ["2000 AI Posts", "10 Accounts", "Unlimited Workspaces"],
      },
    },
    cta: {
      title: "Ready to go viral?",
      primaryCta: "Start your free trial",
    },
    footer: {
      termsOfServices: "Terms of services",
      privacyPolicy: "Privacy policy",
      copyright: "© HustlePost. All rights reserved.",
    },
  },
  ko: {
    brand: {
      label: "HustlePost",
      subtitle: "트렌드 분석 AI",
    },
    nav: {
      features: "기능",
      pricing: "요금제",
      login: "로그인",
      startFree: "Start for free",
      dashboard: "대시보드",
    },
    locale: {
      label: "Language",
      english: "English",
      korean: "한국어",
    },
    hero: {
      title: "터지는 스레드 포스트, 이제 빈칸 채우기만큼 쉽습니다.",
      description: "타겟 키워드와 브랜드 보이스만 입력하세요. 트렌드 분석 AI가 정보성, 소통형, 제품 유도형 초안을 10초 만에 생성하고 큐(Queue)에 예약합니다.",
      primaryCta: "Start your free trial",
      signedInPrimaryCta: "대시보드 열기",
    },
    features: {
      badge: "핵심 기능",
      video1: {
        title: "커스터마이징 AI 글 생성",
        description: "정보성, 참여성, 홍보성 등 목적에 맞는 최적화된 글을 손쉽게 만들어주는 맞춤형 AI 기능을 경험해보세요.",
        primaryCta: "작성 시작하기",
        secondaryCta: "더 알아보기",
      },
      video2: {
        title: "스마트 예약 큐 시스템",
        description: "원하는 시간대와 요일만 지정해두면 완성된 글이 자동으로 슬롯에 들어가 알아서 발행됩니다.",
        primaryCta: "스케줄링 시작하기",
        secondaryCta: "기능 살펴보기",
      },
      video3: {
        title: "일원화된 댓글 관리",
        description: "발행된 모든 포스트의 반응과 댓글을 한곳에서 모아보고 빠짐없이 손쉽게 관리하세요.",
        primaryCta: "관리 시작하기",
        secondaryCta: "기능 살펴보기",
      },
    },
    howItWorks: {
      badge: "작동 원리",
      title: "키워드 하나에서",
      titleHighlight: "스마트 초안까지",
      description: "스레드 계정을 연결하세요. 입력된 키워드와 브랜드 보이스를 분석하여, 독창적인 초안을 자동으로 생성하고 콘텐츠 캘린더에 예약합니다.",
      step1: "계정 연결",
      step2: "AI 스마트 초안 작성",
      step3: "콘텐츠 캘린더 & 스케줄링",
      step1Desc: "스레드 계정을 연결하고 키워드와 톤을 맞춤 설정하세요.",
      step2Desc: "Creative Generation Engine이 입력 데이터를 분석해 독창적이고 최적화된 초안을 만듭니다.",
      step3Desc: "생성된 초안이 콘텐츠 캘린더에 자동으로 배치되고 지정된 시간에 발행됩니다.",
      account1: "@브랜드_공식",
      account2: "@자기계발_성장",
      account3: "@사이드_허슬",
      output1: "정보성 타입",
      output2: "소통형 타입",
      output3: "제품 유도 타입",
    },
    pricing: {
      title: "Pricing",
      monthly: "/mo",
      starter: {
        name: "Starter",
        price: "$9",
        features: ["100 AI Posts", "1 Account"],
      },
      pro: {
        name: "Pro",
        price: "$39",
        highlight: "인기",
        features: ["500 AI Posts", "3 Accounts", "Smart Queue"],
      },
      agency: {
        name: "Agency",
        price: "$59",
        features: ["2000 AI Posts", "10 Accounts", "Unlimited Workspaces"],
      },
    },
    cta: {
      title: "터지는 포스트, 지금 바로 시작하세요.",
      primaryCta: "Start your free trial",
    },
    footer: {
      termsOfServices: "이용약관",
      privacyPolicy: "개인정보 처리방침",
      copyright: "© HustlePost. All rights reserved.",
    },
  },
};

export function getLandingCopy(locale: Locale): LandingDictionary {
  return LANDING_COPY[locale];
}
