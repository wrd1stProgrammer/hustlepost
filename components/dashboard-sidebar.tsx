"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useState, type ComponentType } from "react";
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
  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? workspaces[0];

  type NavItem = {
    label: string;
    href: string;
    icon: ComponentType<{ className?: string; strokeWidth?: number }>;
    exact?: boolean;
    badge?: number;
    queryTab?: string;
  };

  const navItems: Record<"create" | "posts" | "workspace" | "configuration", NavItem[]> = {
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

  const NavLink = ({ item }: { item: NavItem }) => {
    let isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href);

    if (item.queryTab) {
      const activeTab = searchParams.get("tab") ?? "";
      isActive = pathname.startsWith("/dashboard/settings") && activeTab === item.queryTab;
    }

    return (
      <Link
        href={item.href}
        className={`flex items-center justify-between px-3 py-2 text-sm transition-colors rounded-lg group ${
          isActive 
            ? "bg-slate-100 text-slate-900 font-medium" 
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`}
      >
        <div className="flex items-center gap-3">
          <item.icon className={`h-[18px] w-[18px] ${isActive ? "text-slate-900" : "text-slate-500 group-hover:text-slate-700"}`} strokeWidth={isActive ? 2.5 : 2} />
          <span>{item.label}</span>
        </div>
        {item.badge !== undefined && item.badge > 0 && (
          <span className="text-[11px] font-semibold text-slate-500">{item.badge}</span>
        )}
      </Link>
    );
  };

  return (
    <aside className="relative z-0 flex h-full w-[260px] flex-col border-r border-slate-200 bg-white">
      {/* Brand & Workspace Header */}
      <div className="p-4 border-b border-slate-100 shrink-0">
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
          <span className="text-[1.1rem] font-bold tracking-tight text-slate-900">{t.brand}</span>
        </Link>

        <div className="px-2 mb-2 text-xs text-slate-500 font-medium">
          {t.workspaceMenu.label}
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setWorkspaceMenuOpen((value) => !value)}
            className="w-full flex items-center justify-between rounded-xl border border-blue-500 px-3 py-2.5 text-left transition-colors hover:bg-slate-50"
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
              <div className="space-y-2">
                {workspaces.map((workspace) => (
                  <form
                    key={workspace.id}
                    action={selectWorkspaceAction}
                    onSubmit={() => setWorkspaceMenuOpen(false)}
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
                        <span className="text-sm font-semibold">
                          {workspace.name}
                        </span>
                      </div>
                    </button>
                  </form>
                ))}
              </div>

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
            className="w-full flex items-center justify-center gap-2 bg-[#4ADE80] text-emerald-950 font-semibold text-sm py-2.5 rounded-lg hover:bg-[#34D399] transition-colors"
          >
            <span className="border border-emerald-950/30 rounded p-[1px] shadow-sm bg-emerald-900/5">
               <FileText className="h-[14px] w-[14px] text-emerald-950" />
            </span>
            {t.createPostBtn}
          </Link>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-6">
        <div>
          <button className="w-full flex items-center justify-between px-3 mb-1 text-xs text-slate-500 group">
            <span>{t.sections.create}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
          </button>
          <div className="space-y-[2px]">
            {navItems.create.map(item => <NavLink key={item.label} item={item} />)}
          </div>
        </div>

        <div>
           <button className="w-full flex items-center justify-between px-3 mb-1 text-xs text-slate-500 group">
            <span>{t.sections.posts}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
          </button>
          <div className="space-y-[2px]">
            {navItems.posts.map(item => <NavLink key={item.label} item={item} />)}
          </div>
        </div>

        <div>
           <button className="w-full flex items-center justify-between px-3 mb-1 text-xs text-slate-500 group">
            <span>{t.sections.workspace}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
          </button>
          <div className="space-y-[2px]">
            {navItems.workspace.map(item => <NavLink key={item.label} item={item} />)}
          </div>
        </div>

        <div>
           <button className="w-full flex items-center justify-between px-3 mb-1 text-xs text-slate-500 group">
            <span>{t.sections.configuration}</span>
            <ChevronDown className="h-3.5 w-3.5 opacity-50" />
          </button>
          <div className="space-y-[2px]">
            {navItems.configuration.map(item => <NavLink key={item.label} item={item} />)}
          </div>
        </div>
      </div>

      {/* Footer (Profile & Unified Menu) */}
      <div className="p-4 border-t border-slate-100 shrink-0 relative">
        <button
          onClick={() => setProfileMenuOpen((prev) => !prev)}
          className="w-full flex items-center justify-between hover:bg-slate-50 p-2 rounded-xl transition-colors text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 bg-purple-500 text-white flex items-center justify-center rounded-full text-sm font-semibold">
              {userName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-medium text-slate-900">{userName}</div>
              <div className="text-xs text-slate-500">{userPlan || (locale === "ko" ? "무료 플랜" : "Free Plan")}</div>
            </div>
          </div>
          {profileMenuOpen ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </button>

        {profileMenuOpen && (
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

            <div className="my-2 h-px bg-slate-100 mx-2" />

            <div className="px-3 mb-1 mt-2 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                {locale === "ko" ? "언어 설정" : "Language"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1 px-2 mb-2">
              {localeLinks.map((link) => (
                <a
                  key={link.locale}
                  href={link.href}
                  className={`text-center py-1.5 rounded-lg text-xs transition-colors ${
                    locale === link.locale
                      ? "bg-slate-100 text-slate-900 font-bold shadow-sm border border-slate-200/50"
                      : "text-slate-500 font-medium hover:bg-slate-50 border border-transparent hover:text-slate-900"
                  }`}
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="my-2 h-px bg-slate-100 mx-2" />

            <form action={signOutAction}>
              <button className="w-full flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50">
                <LogOut className="h-4 w-4" />
                {t.signOut}
              </button>
            </form>
          </div>
        )}
      </div>
    </aside>
  );
}
