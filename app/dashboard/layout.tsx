import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { getRequestLocale, buildPathWithSearch } from "@/lib/i18n/request";
import { getDashboardCopy } from "@/lib/i18n/dashboard";
import {
  listConnectedAccounts,
} from "@/lib/db/accounts";
import {
  selectWorkspaceAction,
  signOutAction,
} from "./actions";
import {
  getActiveWorkspace,
  getWorkspaceState,
} from "@/lib/dashboard/workspaces";

export const maxDuration = 300;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, plan")
    .eq("id", user.id)
    .maybeSingle();
  
  const locale = await getRequestLocale();
  const accounts = await listConnectedAccounts(user.id);
  const workspaceState = await getWorkspaceState({
    userId: user.id,
    fallbackKeywords: [],
  });
  const activeWorkspace = getActiveWorkspace(workspaceState);

  if (!activeWorkspace) {
    redirect("/onboarding");
  }

  const activeConnectionCount = accounts.filter(a => a.account_status === "active").length;
  const [
    queuedPostsResult,
    draftPostsResult,
  ] = await Promise.all([
    supabase
      .from("scheduled_posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .in("status", ["scheduled", "processing"]),
    supabase
      .from("scheduled_posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "draft")
      .eq("workspace_id", activeWorkspace.id),
  ]);

  if (queuedPostsResult.error) {
    throw queuedPostsResult.error;
  }

  if (draftPostsResult.error) {
    throw draftPostsResult.error;
  }

  const queuedPosts = queuedPostsResult.count ?? 0;
  const draftPostsCount = draftPostsResult.count ?? 0;

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
    <div className="min-h-screen bg-[#f4f5f8] text-slate-900 font-sans lg:flex lg:h-screen lg:overflow-hidden">
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
      <main className="relative z-10 min-w-0 flex-1 overflow-x-hidden bg-[#f4f5f8] lg:overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
