import { redirect } from "next/navigation";
import {
  ensureProfile,
  listConnectedAccountsWithKeywords,
} from "@/lib/db/accounts";
import { listGeneratedHooks } from "@/lib/db/generated-hooks";
import { getDashboardCopy } from "@/lib/i18n/dashboard";
import { getRequestLocale } from "@/lib/i18n/request";
import {
  generateAccountDraftsAction,
  publishGeneratedDraftNowAction,
  saveDraftPostsAction,
  scheduleGeneratedDraftAction,
} from "./actions";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { BetaDraftStudio } from "@/components/beta-draft-studio";
import {
  deriveWorkspaceKeywordsFromAccounts,
  getActiveWorkspace,
  getWorkspaceState,
} from "@/lib/dashboard/workspaces";

export default async function DashboardComposePage({
  searchParams,
}: {
  searchParams: Promise<{
    lang?: string;
    error?: string;
    drafts?: string;
    draft_count?: string;
    published?: string;
    published_count?: string;
    failed_count?: string;
    scheduled?: string;
    scheduled_count?: string;
    draft_saved?: string;
    draft_saved_count?: string;
    account?: string;
    workspace?: string;
  }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await ensureProfile(user);
  const params = await searchParams;
  const locale = await getRequestLocale(params.lang);
  const t = getDashboardCopy(locale).pages.compose;
  const accounts = await listConnectedAccountsWithKeywords(user.id);
  const threadAccounts = accounts.filter((account) => account.platform === "threads");
  const workspaceState = await getWorkspaceState({
    userId: user.id,
    fallbackKeywords: deriveWorkspaceKeywordsFromAccounts(threadAccounts),
  });
  const activeWorkspace = getActiveWorkspace(workspaceState, params.workspace);

  if (!activeWorkspace) {
    redirect("/onboarding");
  }
  const recentGeneratedHooks = (await listGeneratedHooks(user.id, 24))
    .filter((hook) => hook.platform_target.includes("threads"))
    .slice(0, 18);
  const renderedAt = new Date().toISOString();

  const feedback =
    params.error === "missing_connected_account"
      ? { type: "error" as const, message: t.missingConnectedAccount }
      : params.error === "missing_account_keywords"
      ? { type: "error" as const, message: t.missingAccountKeywords }
      : params.error === "no_viral_posts"
        ? { type: "error" as const, message: t.noViralPosts }
        : params.error === "ingestion_unavailable"
          ? { type: "error" as const, message: t.ingestionUnavailable }
          : params.error === "draft_generation_failed" || params.error === "hook_generation_failed"
            ? { type: "error" as const, message: t.draftGenerationFailed }
              : params.error
                ? params.error === "publish_failed"
                  ? { type: "error" as const, message: t.publishFailed }
                  : { type: "error" as const, message: t.genericError }
                : params.drafts === "1"
                  ? {
                      type: "success" as const,
                      message: params.draft_count
                        ? `${t.draftsGenerated} (${params.draft_count})`
                        : t.draftsGenerated,
                    }
                  : params.published === "1"
                  ? {
                      type: params.failed_count && Number(params.failed_count) > 0 ? "error" as const : "success" as const,
                      message:
                        params.failed_count && Number(params.failed_count) > 0
                          ? `${t.publishedPartial} (${params.published_count ?? "0"} success / ${params.failed_count} failed)`
                          : params.published_count
                            ? `${t.published} (${params.published_count})`
                            : t.published,
                    }
                  : params.scheduled === "1"
                    ? {
                        type: "success" as const,
                        message: params.scheduled_count
                          ? `${t.scheduled} (${params.scheduled_count})`
                          : t.scheduled,
                      }
                    : params.draft_saved === "1"
                      ? {
                          type: "success" as const,
                          message: params.draft_saved_count
                            ? `${t.draftSaved} (${params.draft_saved_count})`
                            : t.draftSaved,
                        }
                      : null;

  return (
    <div className="relative z-20 mx-auto min-h-full max-w-[1660px] isolate px-7 py-7 lg:px-9 lg:py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-[28px] font-bold tracking-tight text-[#2f394c]">
          {t.title}
        </h1>
      </div>

      {threadAccounts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
          <p className="text-[15px] font-medium text-slate-500">{t.noThreadsAccounts}</p>
        </div>
      ) : (
        <BetaDraftStudio
          locale={locale}
          accounts={threadAccounts}
          drafts={recentGeneratedHooks}
          generateDraftsAction={generateAccountDraftsAction}
          feedback={feedback}
          activeAccountId={params.account}
          activeWorkspace={activeWorkspace}
          connectAccountHref="/api/oauth/threads"
          publishDraftNowAction={publishGeneratedDraftNowAction}
          saveDraftPostsAction={saveDraftPostsAction}
          scheduleGeneratedDraftAction={scheduleGeneratedDraftAction}
          renderedAt={renderedAt}
        />
      )}
    </div>
  );
}
