import { redirect } from "next/navigation";
import { ensureProfile, listConnectedAccountsWithKeywords } from "@/lib/db/accounts";
import { listScheduledPosts } from "@/lib/db/publishing";
import { getDashboardCopy } from "@/lib/i18n/dashboard";
import { getIntlLocale } from "@/lib/i18n/locales";
import { getRequestLocale } from "@/lib/i18n/request";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { ConnectedAccountAvatar } from "@/components/connected-account-avatar";
import { getScheduledPostReplyTexts } from "@/lib/publishing/replies";
import { PostImageGallery } from "@/components/post-image-gallery";
import {
  deriveWorkspaceKeywordsFromAccounts,
  getActiveWorkspace,
  getWorkspaceState,
} from "@/lib/dashboard/workspaces";
import {
  deleteDraftPostAction,
  publishDraftPostNowAction,
  scheduleDraftPostAction,
} from "../actions";
import { DraftPublishButton } from "@/components/draft-publish-button";
import { DeleteDraftButton } from "@/components/delete-draft-button";
import { DashboardToast } from "@/components/dashboard-toast";

export default async function DashboardDraftsPage({
  searchParams,
}: {
  searchParams: Promise<{
    lang?: string;
    published?: string;
    published_count?: string;
    scheduled?: string;
    scheduled_count?: string;
    deleted?: string;
    error?: string;
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
  const t = getDashboardCopy(locale).pages.drafts;
  const accounts = await listConnectedAccountsWithKeywords(user.id);
  const threadAccounts = accounts.filter((account) => account.platform === "threads");
  const workspaceState = await getWorkspaceState({
    userId: user.id,
    fallbackKeywords: deriveWorkspaceKeywordsFromAccounts(threadAccounts),
  });
  const activeWorkspace = getActiveWorkspace(workspaceState);

  if (!activeWorkspace) {
    redirect("/onboarding");
  }

  const draftPosts = (await listScheduledPosts(user.id, { workspaceId: activeWorkspace.id }))
    .filter((post) => post.status === "draft")
    .sort(
      (left, right) =>
        new Date(right.updated_at ?? right.created_at).getTime() -
        new Date(left.updated_at ?? left.created_at).getTime(),
    );

  const toast =
    params.published === "1"
      ? {
          type: "success" as const,
          message: params.published_count
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
        : params.deleted === "1"
          ? {
              type: "success" as const,
              message: t.deleted,
            }
          : params.error
            ? {
                type: "error" as const,
                message: t.error,
              }
            : null;

  return (
    <div className="p-8 lg:p-12 max-w-[1600px] mx-auto min-h-full">
      <DashboardToast
        toast={toast}
        clearKeys={["published", "published_count", "scheduled", "scheduled_count", "deleted", "error"]}
      />

      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          {t.title}
        </h1>
      </div>

      {draftPosts.length === 0 ? (
        <div className="mt-8 rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
          {t.empty}
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {draftPosts.map((post) => {
            const replyTexts = getScheduledPostReplyTexts({
              replyTexts: post.reply_texts,
              replyText: post.reply_text,
            });
            const displayAt = post.updated_at ?? post.created_at;
            const intlLocale = getIntlLocale(locale);
            const formattedDate = new Intl.DateTimeFormat(
              intlLocale,
              { dateStyle: "medium" },
            ).format(new Date(displayAt));
            const formattedTime = new Intl.DateTimeFormat(
              intlLocale,
              { timeStyle: "short" },
            ).format(new Date(displayAt));

            return (
              <article
                key={post.id}
                className="flex h-[320px] flex-col overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex-1 overflow-y-auto p-5 pb-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[13px] font-semibold text-slate-700">{formattedDate}</span>
                      <span className="text-[12px] font-medium text-slate-400">{formattedTime}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DraftPublishButton
                        scheduledPostId={post.id}
                        redirectTo="/dashboard/drafts"
                        locale={locale}
                        publishAction={publishDraftPostNowAction}
                        scheduleAction={scheduleDraftPostAction}
                      />
                      <DeleteDraftButton
                        scheduledPostId={post.id}
                        redirectTo="/dashboard/drafts"
                        locale={locale}
                        action={deleteDraftPostAction}
                      />
                    </div>
                  </div>

                  <p className="mt-4 whitespace-pre-wrap text-[14px] font-medium leading-[1.6] text-slate-800">
                    {post.post_text}
                  </p>

                  <PostImageGallery imageUrls={post.image_urls} />

                  {replyTexts.length > 0 ? (
                    <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
                      {replyTexts.map((replyText, replyIndex) => (
                        <div key={`${post.id}-reply-${replyIndex}`} className="pl-4">
                          <p className="whitespace-pre-wrap text-[13px] leading-[1.65] text-slate-600">
                            {replyText}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-[#f8f9fa] px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    {post.connected_account ? (
                      <ConnectedAccountAvatar
                        account={post.connected_account}
                        size={28}
                        initialsClassName="text-[11px]"
                        showPlatformBadge
                        ringColorClassName="ring-slate-300"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-500">
                        {post.platform === "threads" ? "@" : "X"}
                      </div>
                    )}
                  </div>

                  <span className="rounded-lg bg-slate-200 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-slate-600">
                    {t.draft}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
