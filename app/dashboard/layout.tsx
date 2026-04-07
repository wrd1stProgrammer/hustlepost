import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { getRequestLocale, buildPathWithSearch } from "@/lib/i18n/request";
import { getDashboardCopy } from "@/lib/i18n/dashboard";
import {
  ensureProfile,
  listConnectedAccounts,
  listConnectedAccountsWithKeywords,
} from "@/lib/db/accounts";
import { listScheduledPosts } from "@/lib/db/publishing";
import { listGeneratedHooks } from "@/lib/db/generated-hooks";
import {
  selectWorkspaceAction,
  signOutAction,
} from "./actions";
import {
  deriveWorkspaceKeywordsFromAccounts,
  getActiveWorkspace,
  getWorkspaceState,
} from "@/lib/dashboard/workspaces";

export const maxDuration = 300;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await ensureProfile(user);

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, plan")
    .eq("id", user.id)
    .maybeSingle();
  
  const locale = await getRequestLocale();
  const accounts = await listConnectedAccounts(user.id);
  const accountsWithKeywords = await listConnectedAccountsWithKeywords(user.id);
  const threadAccounts = accountsWithKeywords.filter(
    (account) => account.platform === "threads",
  );
  const scheduledPosts = await listScheduledPosts(user.id);
  const recentGeneratedHooks = await listGeneratedHooks(user.id);
  const workspaceState = await getWorkspaceState({
    userId: user.id,
    fallbackKeywords: deriveWorkspaceKeywordsFromAccounts(threadAccounts),
  });
  const activeWorkspace = getActiveWorkspace(workspaceState);

  if (!activeWorkspace) {
    redirect("/onboarding");
  }

  const activeConnectionCount = accounts.filter(a => a.account_status === "active").length;
  const queuedPosts = scheduledPosts.filter(p => p.status === "scheduled" || p.status === "processing").length;
  const draftPostsCount = scheduledPosts.filter(
    (post) => post.status === "draft" && post.workspace_id === activeWorkspace.id,
  ).length;

  const copy = getDashboardCopy(locale);

  const userName =
    profile?.display_name?.trim() ||
    (typeof user.user_metadata?.name === "string"
      ? user.user_metadata.name
      : null) ||
    user.email?.split("@")[0] ||
    "User";
  const planName =
    profile?.plan === "team"
      ? "Team Plan"
      : profile?.plan === "pro"
        ? "Pro Plan"
        : "Creator Plan";
  
  // Convert localeLinks
  const localeRedirectTo = buildPathWithSearch("/dashboard", {});

  const localeLinks = [
    { locale: "en", label: "English", href: `/api/locale?locale=en&redirectTo=${encodeURIComponent(localeRedirectTo)}` },
    { locale: "ko", label: "한국어", href: `/api/locale?locale=ko&redirectTo=${encodeURIComponent(localeRedirectTo)}` },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f5f8] text-slate-900 font-sans">
      <DashboardSidebar 
        copy={copy}
        locale={locale}
        connectedAccountsCount={activeConnectionCount}
        scheduledPostsCount={queuedPosts}
        createdPostsCount={draftPostsCount}
        signOutAction={signOutAction}
        localeLinks={localeLinks}
        userName={userName}
        userPlan={planName}
        workspaces={workspaceState.workspaces}
        activeWorkspaceId={activeWorkspace.id}
        selectWorkspaceAction={selectWorkspaceAction}
      />
      <main className="relative z-10 flex-1 overflow-y-auto bg-[#f4f5f8]">
        {children}
      </main>
    </div>
  );
}
