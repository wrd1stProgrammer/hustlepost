import type { Locale } from "@/lib/i18n/locales";

type LegalSection = {
  title: string;
  body: string;
};

export type LegalPageCopy = {
  title: string;
  lastUpdatedLabel: string;
  lastUpdatedDate: string;
  backToHome: string;
  sections: LegalSection[];
};

const TERMS_COPY: Record<Locale, LegalPageCopy> = {
  en: {
    title: "Terms and Conditions for HustlePost",
    lastUpdatedLabel: "Last updated",
    lastUpdatedDate: "April 2, 2026",
    backToHome: "Back to home",
    sections: [
      {
        title: "1. Description of HustlePost",
        body:
          "HustlePost is a social content workflow platform that helps users generate, manage, schedule, and publish posts from one workspace. Features may change over time as the product evolves.",
      },
      {
        title: "2. Acceptance of Terms",
        body:
          "By accessing or using HustlePost, you agree to these Terms and our Privacy Policy. If you do not agree, do not use the service.",
      },
      {
        title: "3. Connected Platform Terms",
        body:
          "When you connect third-party platforms (such as Threads, X, or Google sign-in), you must also comply with each provider's terms and policies. Your use of those integrations is subject to their rules.",
      },
      {
        title: "4. User Data and Privacy",
        body:
          "To provide service functionality, we may process data such as name, email, workspace data, publishing metadata, and connected account tokens. See the Privacy Policy for full details.",
      },
      {
        title: "5. Cookies and Non-Personal Data",
        body:
          "We use cookies and similar technologies to improve performance, maintain sessions, analyze usage patterns, and enhance user experience.",
      },
      {
        title: "6. Content Ownership and Posting Authorization",
        body:
          "You retain ownership of your content. By connecting accounts and using publish features, you grant HustlePost permission to post and manage content on your behalf within your authorized scope.",
      },
      {
        title: "7. Acceptable Use",
        body:
          "You agree not to use HustlePost for unlawful, abusive, fraudulent, or rights-infringing activity, and not to attempt unauthorized access, reverse engineering, or disruption of the service.",
      },
      {
        title: "8. Billing, Subscriptions, and Refunds",
        body:
          "If you purchase a paid plan, billing and renewal terms are shown at checkout. Unless otherwise stated, refund requests are reviewed case-by-case. For billing support, contact kicoa24@gmail.com.",
      },
      {
        title: "9. Termination",
        body:
          "We may suspend or terminate access for policy violations, security risks, abuse, or legal requirements. You may stop using the service at any time.",
      },
      {
        title: "10. Limitation of Liability",
        body:
          "To the maximum extent permitted by law, HustlePost is not liable for indirect, incidental, special, or consequential damages, including data loss, revenue loss, or third-party account actions.",
      },
      {
        title: "11. Changes to These Terms",
        body:
          "We may update these Terms from time to time. Updated Terms will be posted on this page, and material updates may be notified by email or in-product notice.",
      },
      {
        title: "12. Governing Law and Contact",
        body:
          "These Terms are governed by applicable laws in your service jurisdiction unless otherwise required by local law. For questions, contact kicoa24@gmail.com.",
      },
    ],
  },
  ko: {
    title: "HustlePost 이용약관",
    lastUpdatedLabel: "최종 업데이트",
    lastUpdatedDate: "2026년 4월 2일",
    backToHome: "홈으로 돌아가기",
    sections: [
      {
        title: "1. HustlePost 서비스 설명",
        body:
          "HustlePost는 하나의 워크스페이스에서 소셜 콘텐츠를 생성, 관리, 예약, 발행할 수 있도록 돕는 플랫폼입니다. 기능은 서비스 개선에 따라 변경될 수 있습니다.",
      },
      {
        title: "2. 약관 동의",
        body:
          "서비스를 이용하면 본 약관 및 개인정보 처리방침에 동의한 것으로 간주됩니다. 동의하지 않는 경우 서비스 이용을 중단해야 합니다.",
      },
      {
        title: "3. 외부 플랫폼 약관 준수",
        body:
          "Threads, X, Google 로그인 등 외부 플랫폼 연동 기능을 사용할 경우 각 플랫폼의 약관 및 정책을 함께 준수해야 합니다.",
      },
      {
        title: "4. 사용자 데이터 및 개인정보",
        body:
          "서비스 제공을 위해 이름, 이메일, 워크스페이스 데이터, 발행 메타데이터, 연동 계정 토큰 등 필요한 정보를 처리할 수 있습니다. 자세한 내용은 개인정보 처리방침을 따릅니다.",
      },
      {
        title: "5. 쿠키 및 비개인정보",
        body:
          "서비스 품질 개선과 세션 유지, 사용성 분석을 위해 쿠키 및 유사 기술을 사용할 수 있습니다.",
      },
      {
        title: "6. 콘텐츠 소유권 및 게시 권한",
        body:
          "콘텐츠 소유권은 사용자에게 있습니다. 다만 사용자가 계정을 연동하고 발행 기능을 사용할 경우, HustlePost가 사용자 대신 게시/관리할 수 있도록 필요한 권한을 부여하게 됩니다.",
      },
      {
        title: "7. 허용되지 않는 사용",
        body:
          "불법, 사기, 권리침해, 악용 행위 또는 서비스 무력화/무단접근/역공학 시도는 금지됩니다.",
      },
      {
        title: "8. 결제, 구독 및 환불",
        body:
          "유료 플랜 결제 및 갱신 조건은 결제 화면에 고지됩니다. 별도 명시가 없는 경우 환불 요청은 개별 검토됩니다. 결제 문의: kicoa24@gmail.com",
      },
      {
        title: "9. 이용 제한 및 종료",
        body:
          "약관 위반, 보안 위협, 시스템 악용, 법적 요구가 있는 경우 서비스 이용을 제한 또는 종료할 수 있습니다.",
      },
      {
        title: "10. 책임 제한",
        body:
          "법이 허용하는 범위에서 HustlePost는 데이터 손실, 수익 손실, 외부 플랫폼 계정 조치 등 간접적·부수적 손해에 대해 책임을 지지 않습니다.",
      },
      {
        title: "11. 약관 변경",
        body:
          "약관은 필요 시 변경될 수 있으며, 변경 내용은 본 페이지 또는 이메일/서비스 내 공지로 안내됩니다.",
      },
      {
        title: "12. 준거법 및 문의",
        body:
          "관련 법령에 따라 본 약관이 해석됩니다. 문의: kicoa24@gmail.com",
      },
    ],
  },
};

const PRIVACY_COPY: Record<Locale, LegalPageCopy> = {
  en: {
    title: "Privacy Policy",
    lastUpdatedLabel: "Last updated",
    lastUpdatedDate: "April 2, 2026",
    backToHome: "Back to home",
    sections: [
      {
        title: "1. Information We Collect",
        body:
          "We may collect personal data such as name, email address, billing metadata, account profile details, workspace settings, generated drafts, post records, and social account authorization tokens required to provide the service.",
      },
      {
        title: "2. Why We Use Your Data",
        body:
          "We use collected data to authenticate users, process subscriptions, generate and schedule content, publish to connected platforms, provide support, maintain security, and improve product reliability.",
      },
      {
        title: "3. Third-party Services",
        body:
          "We rely on third-party services such as Supabase, AI providers, Cloudinary, and social platform APIs (e.g., Threads, X). Data processing by those providers is subject to their own terms and privacy policies.",
      },
      {
        title: "4. Cookies and Analytics",
        body:
          "We use cookies and similar technologies to maintain sessions, remember settings, analyze usage, and improve service performance.",
      },
      {
        title: "5. Data Sharing",
        body:
          "We do not sell your personal information. We share data only with required service providers and connected platforms to perform requested actions.",
      },
      {
        title: "6. Data Retention and Deletion",
        body:
          "We retain data while your account is active and as needed for legal, operational, and security obligations. You may request deletion of account-related data, subject to legal requirements.",
      },
      {
        title: "7. Security",
        body:
          "We apply commercially reasonable security controls, including encryption for sensitive credentials where applicable. No method of transmission or storage is completely secure.",
      },
      {
        title: "8. Children's Privacy",
        body:
          "HustlePost is not intended for children, and we do not knowingly collect personal data from children.",
      },
      {
        title: "9. Policy Updates and Contact",
        body:
          "We may update this Privacy Policy from time to time. Material updates will be posted on this page or notified in-product/email. Contact: kicoa24@gmail.com",
      },
    ],
  },
  ko: {
    title: "개인정보 처리방침",
    lastUpdatedLabel: "최종 업데이트",
    lastUpdatedDate: "2026년 4월 2일",
    backToHome: "홈으로 돌아가기",
    sections: [
      {
        title: "1. 수집하는 정보",
        body:
          "서비스 제공을 위해 이름, 이메일, 결제 관련 메타데이터, 계정 프로필, 워크스페이스 설정, 생성 초안, 발행 기록, 연동 계정 인증 토큰 등을 수집·처리할 수 있습니다.",
      },
      {
        title: "2. 정보 이용 목적",
        body:
          "수집 정보는 사용자 인증, 구독 처리, 콘텐츠 생성/예약/발행, 고객지원, 보안 유지, 서비스 개선을 위해 사용됩니다.",
      },
      {
        title: "3. 제3자 서비스 이용",
        body:
          "Supabase, AI 제공자, Cloudinary, 소셜 플랫폼 API(예: Threads, X) 등 제3자 서비스를 이용하며, 해당 제공자 정책에 따라 데이터가 처리될 수 있습니다.",
      },
      {
        title: "4. 쿠키 및 분석",
        body:
          "세션 유지, 설정 저장, 사용성 분석 및 서비스 개선을 위해 쿠키 및 유사 기술을 사용할 수 있습니다.",
      },
      {
        title: "5. 정보 공유",
        body:
          "개인정보를 판매하지 않으며, 서비스 제공에 필요한 범위에서만 필수 처리자 및 연동 플랫폼과 정보를 공유합니다.",
      },
      {
        title: "6. 보관 및 삭제",
        body:
          "계정 활성 기간 및 법적·운영·보안상 필요 기간 동안 데이터를 보관합니다. 법적 보관 의무를 제외하고 삭제 요청을 받을 수 있습니다.",
      },
      {
        title: "7. 보안",
        body:
          "민감 정보 보호를 위해 합리적 수준의 보안조치를 적용하며, 필요한 경우 암호화 저장을 사용합니다. 단 100% 완전한 보안을 보장할 수는 없습니다.",
      },
      {
        title: "8. 아동 개인정보",
        body:
          "HustlePost는 아동을 대상으로 하지 않으며, 아동 개인정보를 고의로 수집하지 않습니다.",
      },
      {
        title: "9. 정책 변경 및 문의",
        body:
          "본 처리방침은 변경될 수 있으며, 중요한 변경은 페이지/이메일/서비스 내 공지로 안내됩니다. 문의: kicoa24@gmail.com",
      },
    ],
  },
};

export function getTermsCopy(locale: Locale): LegalPageCopy {
  return TERMS_COPY[locale];
}

export function getPrivacyCopy(locale: Locale): LegalPageCopy {
  return PRIVACY_COPY[locale];
}
