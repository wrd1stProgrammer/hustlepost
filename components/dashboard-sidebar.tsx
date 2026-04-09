"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import {
  FileText,
  CalendarDays,
  LayoutList,
  Clock3,
  CheckCircle2,
  FileSignature,
  BarChart3,
  MessagesSquare,
  Users2,
  ChevronDown,
  ChevronUp,
  LogOut,
  Home,
  Plus,
  Settings,
  Link2,
  HelpCircle,
  CreditCard,
  BookOpen,
  Menu,
  X,
} from "lucide-react";
import type { WorkspaceRecord } from "@/lib/dashboard/workspaces";
import type { DashboardCopy } from "@/lib/i18n/dashboard";
import appIcon from "@/app/assets/icon/icon-192.png";

type Locale = "en" | "ko";

type DashboardSidebarLocaleLink = {
  locale: string;
  label: string;
  href: string;
};

type DashboardSidebarProps = {
  copy: DashboardCopy;
  locale: Locale;
  connectedAccountsCount: number;
  scheduledPostsCount: number;
  createdPostsCount: number;
  signOutAction: () => Promise<void>;
  localeLinks: DashboardSidebarLocaleLink[];
  userName: string;
  userPlan: string;
  workspaces: WorkspaceRecord[];
  activeWorkspaceId: string;
  selectWorkspaceAction: (formData: FormData) => Promise<void>;
};

type NavItem = {
  label: string;
  href: string;
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  exact?: boolean;
  badge?: number;
  queryTab?: string;
};

export function DashboardSidebar({
  copy,
  locale,
  connectedAccountsCount,
  scheduledPostsCount,
  createdPostsCount,
  signOutAction,
  localeLinks,
  userName,
  userPlan,
  workspaces,
  activeWorkspaceId,
  selectWorkspaceAction,
}: DashboardSidebarProps) {
  const t = copy.sidebar;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? workspaces[0];

  const navItems: Record<
    "create" | "posts" | "workspace" | "configuration",
    NavItem[]
  > = {
    create: [
      { label: t.nav.newPost, href: "/dashboard", icon: FileText, exact: true },
    ],
    posts: [
      { label: t.nav.calendar, href: "/dashboard/calendar", icon: CalendarDays },
      { label: t.nav.allPosts, href: "/dashboard/posts", icon: LayoutList },
      { label: t.nav.scheduled, href: "/dashboard/scheduled", icon: Clock3, badge: scheduledPostsCount },
      { label: t.nav.posted, href: "/dashboard/posted", icon: CheckCircle2 },
      { label: t.nav.drafts, href: "/dashboard/drafts", icon: FileSignature, badge: createdPostsCount },
      { label: t.nav.analytics, href: "/dashboard/analytics", icon: BarChart3 },
      { label: t.nav.commentsManagement, href: "/dashboard/comments", icon: MessagesSquare },
    ],
    workspace: [
      { label: t.nav.workspaces, href: "/dashboard/workspaces", icon: Users2, badge: workspaces.length },
      { label: t.nav.connections, href: "/dashboard/connections", icon: Link2, badge: connectedAccountsCount },
    ],
    configuration: [
      { label: t.nav.settings, href: "/dashboard/settings?tab=settings", icon: Settings, queryTab: "settings" },
      { label: t.nav.billing, href: "/dashboard/settings?tab=billing", icon: CreditCard, queryTab: "billing" },
    ],
  };

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    if (mobileNavOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileNavOpen]);

  const profileInitials = userName.slice(0, 2).toUpperCase();

  const closeAllMenus = () => {
    setMobileNavOpen(false);
    setWorkspaceMenuOpen(false);
    setProfileMenuOpen(false);
  };

  const isItemActive = (item: NavItem) => {
    let isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);

    if (item.queryTab) {
      const activeTab = searchParams.get("tab") ?? "";
      isActive = pathname.startsWith("/dashboard/settings") && activeTab === item.queryTab;
    }

    return isActive;
  };

  const renderNavLink = ({
    item,
    onNavigate,
  }: {
    item: NavItem;
    onNavigate?: () => void;
  }) => {
    const isActive = isItemActive(item);

    return (
      <Link
        href={item.href}
        onClick={() => onNavigate?.()}
        className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition-colors group ${
          isActive
            ? "bg-slate-100 text-slate-900 font-medium"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`}
      >
        <div className="flex min-w-0 items-center gap-3">
          <item.icon
            className={`h-[18px] w-[18px] shrink-0 ${
              isActive ? "text-slate-900" : "text-slate-500 group-hover:text-slate-700"
            }`}
            strokeWidth={isActive ? 2.5 : 2}
          />
          <span className="truncate">{item.label}</span>
        </div>
        {item.badge !== undefined && item.badge > 0 ? (
          <span className="shrink-0 text-[11px] font-semibold text-slate-500">
            {item.badge}
          </span>
        ) : null}
      </Link>
    );
  };

  const renderNavSection = ({
    title,
    items,
    onNavigate,
  }: {
    title: string;
    items: NavItem[];
    onNavigate?: () => void;
  }) => (
    <div>
      <div className="mb-2 flex items-center justify-between px-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
        <span>{title}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-50" />
      </div>
      <div className="space-y-1">
        {items.map((item) => renderNavLink({ item, onNavigate }))}
      </div>
    </div>
  );

  const renderWorkspaceList = ({
    onNavigate,
  }: {
    onNavigate?: () => void;
  }) => (
    <div className="space-y-2">
      {workspaces.map((workspace) => (
        <form
          key={workspace.id}
          action={selectWorkspaceAction}
          onSubmit={() => {
            setWorkspaceMenuOpen(false);
            onNavigate?.();
          }}
        >
          <input type="hidden" name="workspaceId" value={workspace.id} />
          <input type="hidden" name="redirectTo" value="/dashboard" />
          <button
            type="submit"
            className={`w-full cursor-pointer rounded-xl px-3 py-2.5 text-left transition ${
              workspace.id === activeWorkspaceId
                ? "bg-slate-700 text-white"
                : "bg-slate-50 text-slate-800 hover:bg-slate-100"
            }`}
          >
            <div className="flex items-center gap-3">
              <Home className="h-4 w-4" />
              <span className="text-sm font-semibold">{workspace.name}</span>
            </div>
          </button>
        </form>
      ))}
    </div>
  );

  return (
    <>
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2 text-slate-900 transition-opacity hover:opacity-80"
          >
            <Image
              src={appIcon}
              alt="Hustle Post"
              width={28}
              height={28}
              className="rounded-md object-cover"
            />
            <span className="truncate text-[1rem] font-bold tracking-tight text-slate-900">
              {t.brand}
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <div className="min-w-0 text-right">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                {t.workspaceMenu.label}
              </div>
              <div className="max-w-[140px] truncate text-[13px] font-semibold text-slate-900">
                {activeWorkspace?.name ?? t.workspaceName}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
              aria-label={locale === "ko" ? "메뉴 열기" : "Open menu"}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div
        className={`fixed inset-0 z-50 lg:hidden ${
          mobileNavOpen ? "" : "pointer-events-none"
        }`}
        aria-hidden={!mobileNavOpen}
      >
        <button
          type="button"
          onClick={() => setMobileNavOpen(false)}
          className={`absolute inset-0 bg-slate-900/40 transition-opacity ${
            mobileNavOpen ? "opacity-100" : "opacity-0"
          }`}
          aria-label={locale === "ko" ? "메뉴 닫기" : "Close menu"}
        />
        <div
          className={`absolute inset-y-0 left-0 flex w-[min(88vw,360px)] max-w-full flex-col bg-white shadow-[0_24px_80px_rgba(15,23,42,0.18)] transition-transform duration-200 ${
            mobileNavOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
            <Link
              href="/"
              onClick={() => setMobileNavOpen(false)}
              className="flex items-center gap-2 text-slate-900"
            >
              <Image
                src={appIcon}
                alt="Hustle Post"
                width={28}
                height={28}
                className="rounded-md object-cover"
              />
              <span className="text-[1rem] font-bold tracking-tight text-slate-900">
                {t.brand}
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setMobileNavOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
              aria-label={locale === "ko" ? "메뉴 닫기" : "Close menu"}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-5">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                    {t.workspaceMenu.label}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-900">
                    {activeWorkspace?.name ?? t.workspaceName}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setWorkspaceMenuOpen((value) => !value)}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  {locale === "ko" ? "변경" : "Switch"}
                  <ChevronDown
                    className={`h-4 w-4 transition-transform ${
                      workspaceMenuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>

              {workspaceMenuOpen ? (
                <div className="space-y-3">
                  {renderWorkspaceList({ onNavigate: closeAllMenus })}

                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/dashboard/workspaces"
                      className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      onClick={() => setMobileNavOpen(false)}
                    >
                      <Settings className="h-4 w-4" />
                      {t.workspaceMenu.manage}
                    </Link>
                    <Link
                      href="/dashboard/workspaces?create=1"
                      className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                      onClick={() => setMobileNavOpen(false)}
                    >
                      <Plus className="h-4 w-4" />
                      {t.workspaceMenu.create}
                    </Link>
                  </div>
                </div>
              ) : null}
            </div>

            <Link
              href="/dashboard"
              onClick={() => setMobileNavOpen(false)}
              className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-[#4ADE80] px-4 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-[#34D399]"
            >
              <span className="rounded p-[1px] border border-emerald-950/30 bg-emerald-900/5 shadow-sm">
                <FileText className="h-[14px] w-[14px] text-emerald-950" />
              </span>
              {t.createPostBtn}
            </Link>

            <div className="mt-6 space-y-6">
              {renderNavSection({
                title: t.sections.create,
                items: navItems.create,
                onNavigate: closeAllMenus,
              })}
              {renderNavSection({
                title: t.sections.posts,
                items: navItems.posts,
                onNavigate: closeAllMenus,
              })}
              {renderNavSection({
                title: t.sections.workspace,
                items: navItems.workspace,
                onNavigate: closeAllMenus,
              })}
              {renderNavSection({
                title: t.sections.configuration,
                items: navItems.configuration,
                onNavigate: closeAllMenus,
              })}
            </div>
          </div>

          <div className="border-t border-slate-100 p-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500 text-sm font-semibold text-white">
                  {profileInitials}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-900">{userName}</div>
                  <div className="truncate text-xs text-slate-500">
                    {userPlan || (locale === "ko" ? "무료 플랜" : "Free Plan")}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link
                  href="/dashboard/settings?tab=settings"
                  onClick={() => setMobileNavOpen(false)}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Settings className="h-4 w-4" />
                  {locale === "ko" ? "설정" : "Settings"}
                </Link>
                <Link
                  href="/dashboard/settings?tab=plans"
                  onClick={() => setMobileNavOpen(false)}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <BookOpen className="h-4 w-4" />
                  {locale === "ko" ? "플랜" : "Plans"}
                </Link>
                <Link
                  href="/dashboard/support"
                  onClick={() => setMobileNavOpen(false)}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <HelpCircle className="h-4 w-4" />
                  {locale === "ko" ? "고객 지원" : "Support"}
                </Link>
                <Link
                  href="/dashboard/settings?tab=billing"
                  onClick={() => setMobileNavOpen(false)}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <CreditCard className="h-4 w-4" />
                  {locale === "ko" ? "결제 관리" : "Billing"}
                </Link>
              </div>

              <div className="mt-4">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  {locale === "ko" ? "언어 설정" : "Language"}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {localeLinks.map((link) => (
                    <a
                      key={link.locale}
                      href={link.href}
                      className={`rounded-xl px-3 py-2.5 text-center text-sm transition-colors ${
                        locale === link.locale
                          ? "border border-slate-200 bg-white font-bold text-slate-900 shadow-sm"
                          : "border border-transparent bg-white/70 font-medium text-slate-500 hover:bg-white hover:text-slate-900"
                      }`}
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>

              <form action={signOutAction} className="mt-4">
                <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 transition hover:bg-red-100">
                  <LogOut className="h-4 w-4" />
                  {t.signOut}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <aside className="relative z-0 hidden h-full w-[260px] flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="shrink-0 border-b border-slate-100 p-4">
          <Link
            href="/"
            className="mb-6 flex items-center gap-2 px-2 text-slate-900 transition-opacity hover:opacity-80"
          >
            <Image
              src={appIcon}
              alt="Hustle Post"
              width={24}
              height={24}
              className="rounded-md object-cover"
            />
            <span className="text-[1.1rem] font-bold tracking-tight text-slate-900">
              {t.brand}
            </span>
          </Link>

          <div className="mb-2 px-2 text-xs font-medium text-slate-500">
            {t.workspaceMenu.label}
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setWorkspaceMenuOpen((value) => !value)}
              className="flex w-full items-center justify-between rounded-xl border border-blue-500 px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <Home className="h-4 w-4 text-slate-700" />
                <span className="text-sm font-semibold text-slate-900">
                  {activeWorkspace?.name ?? t.workspaceName}
                </span>
              </div>
              <ChevronDown
                className={`h-4 w-4 text-slate-400 transition-transform ${
                  workspaceMenuOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {workspaceMenuOpen ? (
              <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
                {renderWorkspaceList({})}

                <div className="my-4 h-px bg-slate-200" />

                <Link
                  href="/dashboard/workspaces"
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  onClick={() => setWorkspaceMenuOpen(false)}
                >
                  <Settings className="h-5 w-5" />
                  {t.workspaceMenu.manage}
                </Link>

                <Link
                  href="/dashboard/workspaces?create=1"
                  className="mt-1 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  onClick={() => setWorkspaceMenuOpen(false)}
                >
                  <Plus className="h-5 w-5" />
                  {t.workspaceMenu.create}
                </Link>
              </div>
            ) : null}
          </div>

          <div className="mt-5">
            <Link
              href="/dashboard"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#4ADE80] py-2.5 text-sm font-semibold text-emerald-950 transition-colors hover:bg-[#34D399]"
            >
              <span className="rounded border border-emerald-950/30 bg-emerald-900/5 p-[1px] shadow-sm">
                <FileText className="h-[14px] w-[14px] text-emerald-950" />
              </span>
              {t.createPostBtn}
            </Link>
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-2 py-4">
          {renderNavSection({ title: t.sections.create, items: navItems.create })}
          {renderNavSection({ title: t.sections.posts, items: navItems.posts })}
          {renderNavSection({ title: t.sections.workspace, items: navItems.workspace })}
          {renderNavSection({
            title: t.sections.configuration,
            items: navItems.configuration,
          })}
        </div>

        <div className="relative shrink-0 border-t border-slate-100 p-4">
          <button
            onClick={() => setProfileMenuOpen((prev) => !prev)}
            className="group flex w-full items-center justify-between rounded-xl p-2 text-left transition-colors hover:bg-slate-50"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-500 text-sm font-semibold text-white">
                {profileInitials}
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900">{userName}</div>
                <div className="text-xs text-slate-500">
                  {userPlan || (locale === "ko" ? "무료 플랜" : "Free Plan")}
                </div>
              </div>
            </div>
            {profileMenuOpen ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>

          {profileMenuOpen ? (
            <div className="absolute bottom-[calc(100%-10px)] left-4 right-4 z-40 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_4px_24px_rgba(15,23,42,0.08)]">
              <div className="space-y-1">
                <Link
                  href="/dashboard/settings?tab=settings"
                  onClick={() => setProfileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Settings className="h-4 w-4" />
                  {locale === "ko" ? "설정" : "Settings"}
                </Link>
                <Link
                  href="/dashboard/settings?tab=plans"
                  onClick={() => setProfileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <BookOpen className="h-4 w-4" />
                  {locale === "ko" ? "플랜" : "Plans"}
                </Link>
                <Link
                  href="/dashboard/support"
                  onClick={() => setProfileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <HelpCircle className="h-4 w-4" />
                  {locale === "ko" ? "고객 지원" : "Support"}
                </Link>
                <Link
                  href="/dashboard/settings?tab=billing"
                  onClick={() => setProfileMenuOpen(false)}
                  className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <CreditCard className="h-4 w-4" />
                  {locale === "ko" ? "결제 관리" : "Billing"}
                </Link>
              </div>

              <div className="mx-2 my-2 h-px bg-slate-100" />

              <div className="mb-1 mt-2 flex items-center justify-between px-3">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {locale === "ko" ? "언어 설정" : "Language"}
                </span>
              </div>
              <div className="mb-2 grid grid-cols-2 gap-1 px-2">
                {localeLinks.map((link) => (
                  <a
                    key={link.locale}
                    href={link.href}
                    className={`rounded-lg py-1.5 text-center text-xs transition-colors ${
                      locale === link.locale
                        ? "border border-slate-200/50 bg-slate-100 font-bold text-slate-900 shadow-sm"
                        : "border border-transparent font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    {link.label}
                  </a>
                ))}
              </div>

              <div className="mx-2 my-2 h-px bg-slate-100" />

              <form action={signOutAction}>
                <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50">
                  <LogOut className="h-4 w-4" />
                  {t.signOut}
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </aside>
    </>
  );
}
