import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listConnectedAccountsWithKeywords } from "@/lib/db/accounts";
import { getDashboardCopy } from "@/lib/i18n/dashboard";
import { getIntlLocale } from "@/lib/i18n/locales";
import { getRequestLocale } from "@/lib/i18n/request";
import { listScheduledPosts } from "@/lib/db/publishing";
import { RefreshCcw, Filter, ChevronDown } from "lucide-react";
import { ConnectedAccountAvatar } from "@/components/connected-account-avatar";
import { getScheduledPostReplyTexts } from "@/lib/publishing/replies";
import { PostImageGallery } from "@/components/post-image-gallery";
import { cancelScheduledPostAction } from "../actions";
import {
  deriveWorkspaceKeywordsFromAccounts,
  getActiveWorkspace,
  getWorkspaceState,
} from "@/lib/dashboard/workspaces";

export default async function DashboardAllPostsPage({
  searchParams,
}: {
  searchParams: Promise<{
    lang?: string;
  }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const locale = await getRequestLocale(params.lang);
  const t = getDashboardCopy(locale).pages.posts;
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

  const scheduledPosts = await listScheduledPosts(user.id, {
    workspaceId: activeWorkspace.id,
    includeLatestPublishRuns: false,
  });

  return (
    <div className="mx-auto min-h-full max-w-[1600px] px-4 py-5 sm:p-8 lg:p-12">
      <div className="mb-6 flex items-start justify-between gap-4 sm:mb-8 sm:items-center">
         <h1 className="flex items-center gap-2 text-[1.75rem] font-semibold tracking-tight text-slate-900 sm:text-3xl">
           {t.title}
           <span className="text-slate-400 text-sm font-normal cursor-help" title={t.info}>ⓘ</span>
         </h1>
         <button className="p-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-lg shadow-sm transition-colors text-slate-500">
            <RefreshCcw className="h-4 w-4" />
         </button>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2 sm:mb-8 sm:gap-3">
        <div className="p-2 text-slate-400 pr-1"><Filter className="h-4 w-4" /></div>
        
        <button className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 bg-slate-100 rounded-lg text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-200 transition-colors">
            {t.newest}
            <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>
        <button className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 bg-slate-100 rounded-lg text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-200 transition-colors">
            {t.platform}
            <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>
        <button className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 bg-slate-100 rounded-lg text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-200 transition-colors">
            {t.time}
            <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>
        <button className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 bg-slate-100 rounded-lg text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-200 transition-colors">
            {t.accounts}
            <ChevronDown className="h-4 w-4 text-slate-400" />
        </button>
      </div>

      {scheduledPosts.length === 0 ? (
        <div className="mt-8 rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
          {t.empty}
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:mt-8 sm:gap-5 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {scheduledPosts.map((post) => {
            const scheduledAt = post.scheduled_for;
            const replyTexts = getScheduledPostReplyTexts({
              replyTexts: post.reply_texts,
              replyText: post.reply_text,
            });
            const intlLocale = getIntlLocale(locale);
            const formattedDate = new Intl.DateTimeFormat(
              intlLocale,
              { dateStyle: "medium" },
            ).format(new Date(scheduledAt));
            const formattedTime = new Intl.DateTimeFormat(
              intlLocale,
              { timeStyle: "short" },
            ).format(new Date(scheduledAt));

            return (
              <article
                key={post.id}
                className="flex h-[280px] flex-col overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md sm:h-[320px]"
              >
                <div className="flex-1 overflow-y-auto p-5 pb-6">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[13px] font-semibold text-slate-700">{formattedDate}</span>
                      <span className="text-[12px] font-medium text-slate-400">{formattedTime}</span>
                    </div>
                    {post.status === "scheduled" || post.status === "processing" ? (
                      <form action={cancelScheduledPostAction}>
                        <input type="hidden" name="postId" value={post.id} />
                        <input type="hidden" name="redirectTo" value="/dashboard/posts" />
                        <button 
                           type="submit" 
                           className="inline-flex shrink-0 items-center justify-center rounded-full bg-slate-100 text-red-600 hover:bg-red-50 hover:text-red-700 px-3 py-1.5 text-[11px] font-bold transition-colors"
                        >
                          {t.cancel}
                        </button>
                      </form>
                    ) : null}
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
                        ringColorClassName={post.status === "scheduled" ? "ring-[#00B2FF]" : "ring-emerald-500"}
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-500">
                        {post.platform === "threads" ? "@" : "X"}
                      </div>
                    )}
                  </div>

                  <span
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase ${
                      post.status === "scheduled"
                        ? "bg-[#00B2FF] text-white"
                        : "bg-emerald-500 text-white"
                    }`}
                  >
                    {post.status}
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
