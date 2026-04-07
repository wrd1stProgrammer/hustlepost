import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  Filter,
  RefreshCcw,
  XCircle,
} from "lucide-react";
import {
  deletePostedThreadsPostAction,
  syncPostedThreadsStatusAction,
} from "@/app/dashboard/actions";
import { ensureProfile } from "@/lib/db/accounts";
import { listScheduledPosts } from "@/lib/db/publishing";
import { getDashboardCopy } from "@/lib/i18n/dashboard";
import { getIntlLocale } from "@/lib/i18n/locales";
import { getRequestLocale } from "@/lib/i18n/request";
import type { SupportedPlatform } from "@/lib/types/db";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { ConnectedAccountAvatar } from "@/components/connected-account-avatar";
import { DeletePostButton } from "@/components/delete-post-button";
import { getConnectedAccountDisplayLabel } from "@/lib/accounts/avatar";
import { DashboardToast } from "@/components/dashboard-toast";
import { PostImageGallery } from "@/components/post-image-gallery";
import { getScheduledPostReplyTexts } from "@/lib/publishing/replies";

type PostedSearchParams = {
  lang?: string;
  status?: "published" | "failed" | "deleted";
  account?: string;
  sort?: "newest" | "oldest";
  platform?: SupportedPlatform | "all";
  range?: "all" | "7d" | "30d";
  deleted?: string;
  already_deleted?: string;
  externally_deleted?: string;
  sync_checked?: string;
  sync_deleted?: string;
  error?: string;
};

export default async function DashboardPostedPage({
  searchParams,
}: {
  searchParams: Promise<PostedSearchParams>;
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
  const copy = getDashboardCopy(locale).pages.posted;
  const allPosts = await listScheduledPosts(user.id);
  const status =
    params.status === "failed"
      ? "failed"
      : params.status === "deleted"
        ? "deleted"
        : "published";
  const sort = params.sort === "oldest" ? "oldest" : "newest";
  const platform =
    params.platform === "x" || params.platform === "threads"
      ? params.platform
      : "all";
  const range = params.range === "7d" || params.range === "30d" ? params.range : "all";
  // eslint-disable-next-line react-hooks/purity -- request-scoped server render time is acceptable for filtering posted history
  const requestNow = Date.now();
  const rangeCutoff =
    range === "7d"
      ? requestNow - 7 * 24 * 60 * 60 * 1000
      : range === "30d"
        ? requestNow - 30 * 24 * 60 * 60 * 1000
        : null;

  const relevantPosts = allPosts
    .filter(
      (post) =>
        post.status === "published" ||
        post.status === "failed" ||
        Boolean(post.deleted_at),
    )
    .filter((post) =>
      params.account ? post.connected_account_id === params.account : true,
    )
    .filter((post) => (platform === "all" ? true : post.platform === platform))
    .filter((post) => {
      if (!rangeCutoff) return true;
      const comparisonTime =
        post.latest_publish_run?.finished_at ?? post.updated_at ?? post.created_at;
      return new Date(comparisonTime).getTime() >= rangeCutoff;
    })
    .sort((left, right) => {
      const leftTime =
        left.latest_publish_run?.finished_at ??
        left.updated_at ??
        left.created_at;
      const rightTime =
        right.latest_publish_run?.finished_at ??
        right.updated_at ??
        right.created_at;

      return sort === "newest"
        ? new Date(rightTime).getTime() - new Date(leftTime).getTime()
        : new Date(leftTime).getTime() - new Date(rightTime).getTime();
    });

  const visiblePosts = relevantPosts.filter((post) => {
    if (status === "deleted") {
      return Boolean(post.deleted_at);
    }

    if (status === "published") {
      return post.status === "published" && !post.deleted_at;
    }

    return post.status === "failed" && !post.deleted_at;
  });
  const publishedCount = relevantPosts.filter(
    (post) => post.status === "published" && !post.deleted_at,
  ).length;
  const failedCount = relevantPosts.filter(
    (post) => post.status === "failed" && !post.deleted_at,
  ).length;
  const deletedCount = relevantPosts.filter((post) => Boolean(post.deleted_at)).length;
  const accountOptions = Array.from(
    new Map(
      relevantPosts
        .filter((post) => post.connected_account)
        .map((post) => [post.connected_account_id, post.connected_account!]),
    ).values(),
  );
  const selectedAccount = params.account
    ? accountOptions.find((account) => account.id === params.account) ?? null
    : null;
  const pageTitle =
    status === "published"
      ? copy.titlePublished
      : status === "failed"
        ? copy.titleFailed
        : copy.titleDeleted;
  const emptyMessage =
    status === "published"
      ? copy.noItemsPublished
      : status === "failed"
        ? copy.noItemsFailed
        : copy.noItemsDeleted;

  const toast =
    params.deleted === "1"
      ? {
          type: "success" as const,
          message: copy.toastDeleted,
        }
      : params.externally_deleted === "1"
        ? {
            type: "info" as const,
            message: copy.toastExternallyDeleted,
          }
        : params.sync_deleted && Number(params.sync_deleted) > 0
          ? {
              type: "info" as const,
              message:
                Number(params.sync_deleted) > 1
                  ? copy.toastSyncDeletedPlural.replace("{count}", params.sync_deleted)
                  : copy.toastSyncDeletedSingle,
            }
          : params.error === "threads_delete_scope_required"
            ? {
                type: "error" as const,
                message: copy.toastDeleteScopeRequired,
              }
            : params.error === "delete_failed"
              ? {
                  type: "error" as const,
                  message: copy.toastDeleteFailed,
                }
              : params.error === "apply_delete_tracking_migration"
                ? {
                    type: "error" as const,
                    message: copy.toastMigrationRequired,
                  }
                : null;

  const buildFilterHref = (next: Partial<PostedSearchParams>) => {
    const qs = new URLSearchParams();
    const merged = {
      ...params,
      ...next,
      status: next.status ?? status,
      sort: next.sort ?? sort,
    };

    if (merged.status) qs.set("status", merged.status);
    if (merged.sort) qs.set("sort", merged.sort);
    if (merged.platform && merged.platform !== "all") qs.set("platform", merged.platform);
    if (merged.range && merged.range !== "all") qs.set("range", merged.range);
    if (merged.account) qs.set("account", merged.account);
    if (params.lang) qs.set("lang", params.lang);

    return `/dashboard/posted?${qs.toString()}`;
  };

  return (
    <div className="mx-auto min-h-full max-w-[1600px] px-8 py-8 lg:px-10">
      <DashboardToast
        toast={toast}
        clearKeys={[
          "deleted",
          "already_deleted",
          "externally_deleted",
          "sync_checked",
          "sync_deleted",
          "error",
        ]}
      />

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h1 className="text-[28px] font-semibold tracking-tight text-slate-950">
            {pageTitle}
          </h1>
          <span className="text-sm text-slate-400">ⓘ</span>
        </div>
        <form action={syncPostedThreadsStatusAction}>
          <input type="hidden" name="redirectTo" value={buildFilterHref({})} />
          <input
            type="hidden"
            name="scheduledPostIdsJson"
            value={JSON.stringify(
              relevantPosts
                .filter(
                  (post) =>
                    post.platform === "threads" &&
                    post.status === "published" &&
                    !post.deleted_at,
                )
                .map((post) => post.id),
            )}
          />
          <button
            type="submit"
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100"
          >
            <RefreshCcw className="h-4 w-4" />
          </button>
        </form>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="p-2 text-slate-400">
          <Filter className="h-4 w-4" />
        </div>
        <Link
          href={buildFilterHref({ sort: sort === "newest" ? "oldest" : "newest" })}
          className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700"
        >
          {sort === "newest" ? copy.newest : copy.oldest}
          <ChevronDown className="h-4 w-4 text-slate-400" />
        </Link>
        <details className="group relative">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">
            {platform === "threads"
              ? copy.threadsOnly
              : platform === "x"
                ? copy.xOnly
                : copy.allPlatforms}
            <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
          </summary>
          <div className="absolute left-0 top-[calc(100%+8px)] z-20 min-w-[220px] rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
            {[
              { value: "all", label: copy.allPlatforms },
              { value: "threads", label: copy.threadsOnly },
              { value: "x", label: copy.xOnly },
            ].map((option) => (
              <Link
                key={option.value}
                href={buildFilterHref({ platform: option.value as PostedSearchParams["platform"] })}
                className={`mt-1 block rounded-xl px-3 py-2 text-sm ${
                  platform === option.value
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </details>
        <details className="group relative">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">
            {range === "7d"
              ? copy.last7Days
              : range === "30d"
                ? copy.last30Days
                : copy.allTime}
            <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
          </summary>
          <div className="absolute left-0 top-[calc(100%+8px)] z-20 min-w-[220px] rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
            {[
              { value: "all", label: copy.allTime },
              { value: "7d", label: copy.last7Days },
              { value: "30d", label: copy.last30Days },
            ].map((option) => (
              <Link
                key={option.value}
                href={buildFilterHref({ range: option.value as PostedSearchParams["range"] })}
                className={`mt-1 block rounded-xl px-3 py-2 text-sm ${
                  range === option.value
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </details>
        <details className="group relative">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-2xl bg-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">
            {selectedAccount
              ? getConnectedAccountDisplayLabel(selectedAccount)
              : copy.allAccounts}
            <ChevronDown className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
          </summary>
          <div className="absolute right-0 top-[calc(100%+8px)] z-20 min-w-[220px] rounded-2xl border border-slate-200 bg-white p-2 shadow-lg">
            <Link
              href={buildFilterHref({ account: "" })}
              className={`block rounded-xl px-3 py-2 text-sm ${
                !params.account
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              {copy.allAccounts}
            </Link>
            {accountOptions.map((account) => (
              <Link
                key={account.id}
                href={buildFilterHref({ account: account.id })}
                className={`mt-1 block rounded-xl px-3 py-2 text-sm ${
                  params.account === account.id
                    ? "bg-slate-900 text-white"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {getConnectedAccountDisplayLabel(account)}
              </Link>
            ))}
          </div>
        </details>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Link
          href={buildFilterHref({ status: "published" })}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
            status === "published"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          <CheckCircle2 className="h-4 w-4" />
          {copy.tabPublished}
          <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-bold">
            {publishedCount}
          </span>
        </Link>
        <Link
          href={buildFilterHref({ status: "failed" })}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
            status === "failed"
              ? "bg-red-100 text-red-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          <XCircle className="h-4 w-4" />
          {copy.tabFailed}
          <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-bold">
            {failedCount}
          </span>
        </Link>
        <Link
          href={buildFilterHref({ status: "deleted" })}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
            status === "deleted"
              ? "bg-slate-200 text-slate-700"
              : "bg-slate-100 text-slate-600"
          }`}
        >
          <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-current/15 text-[10px] font-bold">
            ·
          </span>
          {copy.tabDeleted}
          <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs font-bold">
            {deletedCount}
          </span>
        </Link>
      </div>

      {visiblePosts.length === 0 ? (
        <div className="mt-8 rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {visiblePosts.map((post) => {
            const finishedAt =
              post.latest_publish_run?.finished_at ??
              post.updated_at ??
              post.created_at;
            const replyTexts = getScheduledPostReplyTexts({
              replyTexts: post.reply_texts,
              replyText: post.reply_text,
            });
            const formattedDate = new Intl.DateTimeFormat(
              getIntlLocale(locale),
              {
                dateStyle: "medium",
              },
            ).format(new Date(finishedAt));
            const formattedTime = new Intl.DateTimeFormat(
              getIntlLocale(locale),
              {
                timeStyle: "short",
              },
            ).format(new Date(finishedAt));
            const isDeleted = Boolean(post.deleted_at);

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
                    {post.platform === "threads" && post.status === "published" ? (
                      <DeletePostButton
                        scheduledPostId={post.id}
                        redirectTo={buildFilterHref({})}
                        disabled={isDeleted}
                        locale={locale}
                        action={deletePostedThreadsPostAction}
                      />
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

                  {post.status === "failed" && post.latest_publish_run?.error_message ? (
                    <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3 text-[13px] text-red-700">
                      {post.latest_publish_run.error_message}
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
                        ringColorClassName={post.status === "published" ? "ring-[#20c997]" : "ring-red-400"}
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-500">
                        {post.platform === "threads" ? "@" : "X"}
                      </div>
                    )}
                  </div>

                  <span
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-bold tracking-wide ${
                      isDeleted
                        ? "bg-slate-200 text-slate-600"
                        : post.status === "published"
                          ? "bg-[#20c997] text-white"
                          : "bg-red-100 text-red-700"
                    }`}
                  >
                    {isDeleted
                      ? copy.deletedBadge
                      : post.status === "published"
                        ? copy.postedBadge
                        : copy.failedBadge}
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
