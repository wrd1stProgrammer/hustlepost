import { redirect } from "next/navigation";
import {
  CheckCircle2,
  Filter,
  RefreshCcw,
  Reply,
  MessagesSquare,
  ExternalLink,
  MessageCircle,
  Clock,
} from "lucide-react";
import { ensureProfile } from "@/lib/db/accounts";
import { listScheduledPosts } from "@/lib/db/publishing";
import { getWorkspaceState, getActiveWorkspace } from "@/lib/dashboard/workspaces";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { decryptSecret } from "@/lib/crypto";
import {
  getThreadsMediaComments,
  type ThreadsCommentObject,
} from "@/lib/platforms/threads";
import { ConnectedAccountAvatar } from "@/components/connected-account-avatar";
import { DashboardToast } from "@/components/dashboard-toast";
import { getConnectedAccountDisplayLabel } from "@/lib/accounts/avatar";
import { replyToThreadsCommentAction } from "./actions";
import { ReplyForm, RefreshButton, FilterApplyButton } from "./comments-client";
import { getIntlLocale } from "@/lib/i18n/locales";
import { getRequestLocale } from "@/lib/i18n/request";
import { getDashboardCopy } from "@/lib/i18n/dashboard";

type CommentsSearchParams = {
  lang?: string;
  account?: string;
  sort?: "newest" | "oldest";
  includeReplied?: string;
  minUnanswered?: string;
  replied?: string;
  repliedCommentId?: string;
  error?: string;
};

type CommentReplyNode = {
  id: string;
  author: string;
  usernameLower: string | null;
  text: string;
  timestamp: string | null;
  permalink: string | null;
  isReply: boolean;
  rootPostId: string | null;
  repliedToId: string | null;
  ownedReply?: boolean;
  children: CommentReplyNode[];
};

type ModerationComment = {
  comment: CommentReplyNode;
  replied: boolean;
};

type CommentGroup = {
  postId: string;
  workspaceId: string;
  connectedAccountId: string;
  canReply: boolean;
  workspaceUsernameLower: string | null;
  connectedAccount: NonNullable<Awaited<ReturnType<typeof listScheduledPosts>>[number]["connected_account"]>;
  postText: string;
  postUrl: string | null;
  publishedAt: string;
  comments: CommentReplyNode[];
  moderationComments: ModerationComment[];
  unansweredCount: number;
  lastActivityAt: number;
};

function formatTemplate(
  template: string,
  values: Record<string, string | number>,
) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function getFormattableDate(value: string | null, locale: string) {
  if (!value) return "";
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(value),
  );
}

function toTimestamp(value: string | null | undefined) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function getCommentAuthor(comment: ThreadsCommentObject, fallbackLabel: string) {
  return comment.username ? `@${comment.username}` : fallbackLabel;
}

function buildReplyTree(
  comment: ThreadsCommentObject,
  labels: {
    threadsUser: string;
    noTextProvided: string;
  },
): CommentReplyNode {
  return {
    id: comment.id,
    author: getCommentAuthor(comment, labels.threadsUser),
    usernameLower:
      typeof comment.username === "string" ? comment.username.toLowerCase() : null,
    text: comment.text?.trim() || labels.noTextProvided,
    timestamp: comment.timestamp,
    permalink: comment.permalink,
    isReply: comment.isReply ?? false,
    rootPostId: comment.rootPostId ?? null,
    repliedToId: comment.repliedToId ?? null,
    ownedReply: comment.isReplyOwnedByMe ?? false,
    children: [...comment.children]
      .sort((left, right) => toTimestamp(left.timestamp) - toTimestamp(right.timestamp))
      .map((child) => buildReplyTree(child, labels)),
  };
}

function getLatestCommentTime(comments: CommentReplyNode[]): number {
  return comments.reduce((latest, comment) => {
    const ownTime: number = toTimestamp(comment.timestamp);
    const childTime: number = getLatestCommentTime(comment.children);
    return Math.max(latest, ownTime, childTime);
  }, 0);
}

function countUnansweredComments(comments: ModerationComment[]) {
  return comments.filter((comment) => !comment.replied).length;
}

function isWorkspaceOwnedComment(
  comment: CommentReplyNode,
  workspaceUsernameLower: string | null,
) {
  if (comment.ownedReply) {
    return true;
  }

  if (workspaceUsernameLower && comment.usernameLower === workspaceUsernameLower) {
    return true;
  }

  return false;
}

function hasWorkspaceReplyInDescendants(
  comment: CommentReplyNode,
  workspaceUsernameLower: string | null,
): boolean {
  for (const child of comment.children) {
    if (isWorkspaceOwnedComment(child, workspaceUsernameLower)) {
      return true;
    }

    if (hasWorkspaceReplyInDescendants(child, workspaceUsernameLower)) {
      return true;
    }
  }

  return false;
}

function walkComments(
  comments: CommentReplyNode[],
  callback: (comment: CommentReplyNode) => void,
) {
  for (const comment of comments) {
    callback(comment);
    walkComments(comment.children, callback);
  }
}

function isReplyToAnotherComment(
  comment: CommentReplyNode,
  knownCommentIds: Set<string>,
) {
  if (!comment.repliedToId) {
    return false;
  }

  if (comment.repliedToId === comment.id) {
    return false;
  }

  return knownCommentIds.has(comment.repliedToId);
}

function collectWorkspaceOwnedReplyTargets(
  comments: CommentReplyNode[],
  workspaceUsernameLower: string | null,
  knownCommentIds: Set<string>,
) {
  const targets = new Set<string>();

  walkComments(comments, (comment) => {
    if (!isWorkspaceOwnedComment(comment, workspaceUsernameLower)) {
      return;
    }

    if (!isReplyToAnotherComment(comment, knownCommentIds)) {
      return;
    }

    if (comment.repliedToId) {
      targets.add(comment.repliedToId);
    }
  });

  return targets;
}

function buildModerationComments(
  comments: CommentReplyNode[],
  workspaceUsernameLower: string | null,
) {
  const moderationComments: ModerationComment[] = [];
  const knownCommentIds = new Set<string>();
  walkComments(comments, (comment) => {
    knownCommentIds.add(comment.id);
  });
  const workspaceOwnedReplyTargets = collectWorkspaceOwnedReplyTargets(
    comments,
    workspaceUsernameLower,
    knownCommentIds,
  );

  for (const root of comments) {
    if (isReplyToAnotherComment(root, knownCommentIds)) {
      continue;
    }

    moderationComments.push({
      comment: root,
      replied:
        hasWorkspaceReplyInDescendants(root, workspaceUsernameLower) ||
        workspaceOwnedReplyTargets.has(root.id),
    });
  }

  const nonOwnedComments = moderationComments.filter(
    (entry) => !isWorkspaceOwnedComment(entry.comment, workspaceUsernameLower),
  );

  if (nonOwnedComments.length > 0) {
    return nonOwnedComments;
  }

  return moderationComments;
}

function buildCommentsHref(input: {
  lang?: string;
  account?: string | null;
  sort?: "newest" | "oldest";
  includeReplied?: boolean;
  minUnanswered?: number;
}) {
  const params = new URLSearchParams();

  if (input.lang) params.set("lang", input.lang);
  if (input.account) params.set("account", input.account);
  if (input.sort && input.sort !== "newest") params.set("sort", input.sort);
  if (input.includeReplied) params.set("includeReplied", "1");
  if (input.minUnanswered && input.minUnanswered > 0) {
    params.set("minUnanswered", String(input.minUnanswered));
  }

  const query = params.toString();
  return query ? `/dashboard/comments?${query}` : "/dashboard/comments";
}

/* ─── CommentThread ─── */

function CommentThread({
  group,
  comment,
  locale,
  currentFiltersHref,
  labels,
  replied,
  showReplyForm = true,
  depth = 0,
}: {
  group: CommentGroup;
  comment: CommentReplyNode;
  locale: string;
  currentFiltersHref: string;
  labels: {
    replied: string;
    unanswered: string;
    openComment: string;
    replyPlaceholder: string;
    replyHint: string;
    replyButton: string;
    replyScopeRequired: string;
  };
  replied?: boolean;
  showReplyForm?: boolean;
  depth?: number;
}) {
  const hasReplies = comment.children.length > 0;
  const isReplied = replied ?? (hasReplies || Boolean(comment.ownedReply));
  const isOwned = isWorkspaceOwnedComment(comment, group.workspaceUsernameLower);
  const canReplyToThisComment =
    group.canReply && !isOwned;

  return (
    <div className={depth > 0 ? "ml-6 mt-3 border-l-2 border-slate-100 pl-4" : ""}>
      <div className={`rounded-2xl p-4 ${isOwned ? "bg-emerald-50 border border-emerald-200" : "bg-slate-50"}`}>
        {/* Author row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`text-sm font-semibold truncate ${isOwned ? "text-emerald-800" : "text-slate-900"}`}>
              {comment.author}
            </span>
            {depth === 0 && (
              <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                isReplied
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}>
                {isReplied ? labels.replied : labels.unanswered}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {comment.timestamp && (
              <span className="text-[11px] text-slate-400">
                {getFormattableDate(comment.timestamp, locale)}
              </span>
            )}
            {comment.permalink && (
              <a
                href={comment.permalink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center rounded-lg p-1.5 transition hover:bg-slate-200 cursor-pointer"
                title={labels.openComment}
              >
                <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
              </a>
            )}
          </div>
        </div>

        {/* Comment text */}
        <p className={`mt-2 whitespace-pre-wrap text-sm leading-relaxed ${isOwned ? "text-emerald-700" : "text-slate-700"}`}>
          {comment.text}
        </p>
      </div>

      {/* Nested replies */}
      {hasReplies && (
        <div className="space-y-0">
          {comment.children.map((reply) => (
            <CommentThread
              key={reply.id}
              group={group}
              comment={reply}
              locale={locale}
              currentFiltersHref={currentFiltersHref}
              labels={labels}
              replied={undefined}
              showReplyForm
              depth={depth + 1}
            />
          ))}
        </div>
      )}

      {/* Reply form */}
      {!hasReplies && showReplyForm && (
        canReplyToThisComment ? (
          <ReplyForm
            action={replyToThreadsCommentAction}
            hiddenFields={{
              scheduledPostId: group.postId,
              workspaceId: group.workspaceId,
              connectedAccountId: group.connectedAccountId,
              commentId: comment.id,
              redirectTo: currentFiltersHref,
            }}
            placeholder={labels.replyPlaceholder}
            hint={labels.replyHint}
            buttonLabel={labels.replyButton}
          />
        ) : !group.canReply && !isOwned ? (
          <div className="mt-3 ml-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] leading-5 text-amber-700">
            {labels.replyScopeRequired}
          </div>
        ) : null
      )}
    </div>
  );
}

/* ─── Main Page ─── */

export default async function DashboardCommentsPage({
  searchParams,
}: {
  searchParams: Promise<CommentsSearchParams>;
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
  const intlLocale = getIntlLocale(locale);
  const t = getDashboardCopy(locale).pages.comments;
  const workspaceState = await getWorkspaceState({ userId: user.id });
  const activeWorkspace = getActiveWorkspace(workspaceState);

  if (!activeWorkspace) {
    redirect("/onboarding");
  }

  const allPosts = await listScheduledPosts(user.id, { workspaceId: activeWorkspace.id });
  const publishedPosts = allPosts.filter(
    (post) =>
      post.workspace_id === activeWorkspace.id &&
      post.platform === "threads" &&
      post.status === "published" &&
      Boolean(post.latest_publish_run?.external_post_id) &&
      Boolean(post.connected_account),
  );

  const accountOptions = Array.from(
    new Map(
      publishedPosts
        .filter((post) => post.connected_account)
        .map((post) => [post.connected_account_id, post.connected_account!]),
    ).values(),
  );

  const selectedAccountId =
    params.account && params.account !== "all" ? params.account : "";
  const sortOrder = params.sort === "oldest" ? "oldest" : "newest";
  const includeReplied = params.includeReplied === "1";
  const minUnanswered = Math.max(0, Number(params.minUnanswered ?? 0) || 0);
  const repliedCommentId =
    typeof params.repliedCommentId === "string" ? params.repliedCommentId.trim() : "";

  const selectedPosts = selectedAccountId
    ? publishedPosts.filter((post) => post.connected_account_id === selectedAccountId)
    : publishedPosts;

  const uniqueAccountIds = Array.from(new Set(selectedPosts.map((post) => post.connected_account_id)));

  const accountAuthById = new Map<
    string,
    {
      accessToken: string;
      canReply: boolean;
    }
  >();
  if (uniqueAccountIds.length > 0) {
    const { data: tokenRows } = await supabase
      .from("oauth_tokens")
      .select("connected_account_id, access_token_ciphertext, scopes")
      .eq("platform", "threads")
      .in("connected_account_id", uniqueAccountIds);

    for (const tokenRow of (tokenRows ??
      []) as Array<{
      connected_account_id: string;
      access_token_ciphertext: string;
      scopes?: unknown;
    }>) {
      if (!tokenRow.connected_account_id || !tokenRow.access_token_ciphertext) {
        continue;
      }

      try {
        const canReply =
          Array.isArray(tokenRow.scopes) &&
          tokenRow.scopes.includes("threads_manage_replies");

        accountAuthById.set(
          tokenRow.connected_account_id,
          {
            accessToken: decryptSecret(tokenRow.access_token_ciphertext),
            canReply,
          },
        );
      } catch {
        // Ignore malformed tokens and continue rendering the rest of the page.
      }
    }
  }

  const commentGroups: CommentGroup[] = [];
  await Promise.all(
    selectedPosts.map(async (post) => {
      const accountAuth = accountAuthById.get(post.connected_account_id);
      const mediaId = post.latest_publish_run?.external_post_id;

      if (!accountAuth || !mediaId || !post.connected_account) {
        return;
      }

      try {
        const tree = await getThreadsMediaComments({
          accessToken: accountAuth.accessToken,
          mediaId,
        });

        const comments = tree.comments
          .map((comment) =>
            buildReplyTree(comment, {
              threadsUser: t.threadsUser,
              noTextProvided: t.noTextProvided,
            }),
          )
          .sort((left, right) => toTimestamp(right.timestamp) - toTimestamp(left.timestamp));
        const workspaceUsernameLower =
          post.connected_account.username?.toLowerCase() ?? null;
        const moderationComments = buildModerationComments(
          comments,
          workspaceUsernameLower,
        );
        const unansweredCount = countUnansweredComments(moderationComments);
        const lastActivityAt = Math.max(
          toTimestamp(post.latest_publish_run?.finished_at ?? null),
          getLatestCommentTime(comments),
          toTimestamp(post.updated_at),
          toTimestamp(post.created_at),
        );

        commentGroups.push({
          postId: post.id,
          workspaceId: activeWorkspace.id,
          connectedAccountId: post.connected_account_id,
          canReply: accountAuth.canReply,
          workspaceUsernameLower,
          connectedAccount: post.connected_account,
          postText: post.post_text,
          postUrl: post.latest_publish_run?.external_post_url ?? null,
          publishedAt: post.latest_publish_run?.finished_at ?? post.updated_at ?? post.created_at,
          comments,
          moderationComments,
          unansweredCount,
          lastActivityAt,
        });
      } catch {
        // Skip posts whose comment APIs are unavailable and keep the rest.
      }
    }),
  );

  const filteredGroups = commentGroups
    .map((group) => {
      if (!repliedCommentId) {
        return group;
      }

      const nextModerationComments = group.moderationComments.map((entry) =>
        entry.comment.id === repliedCommentId ? { ...entry, replied: true } : entry,
      );

      const nextUnansweredCount = countUnansweredComments(nextModerationComments);

      return {
        ...group,
        moderationComments: nextModerationComments,
        unansweredCount: nextUnansweredCount,
      };
    })
    .filter((group) => group.moderationComments.length > 0)
    .filter((group) => group.unansweredCount >= minUnanswered)
    .sort((left, right) =>
      sortOrder === "newest"
        ? right.lastActivityAt - left.lastActivityAt
        : left.lastActivityAt - right.lastActivityAt,
    );

  const visibleCommentCount = filteredGroups.reduce(
    (total, group) =>
      total +
      group.moderationComments.length,
    0,
  );

  const redirectHref = buildCommentsHref({
    lang: params.lang,
    account: selectedAccountId || null,
    sort: sortOrder,
    includeReplied,
    minUnanswered,
  });

  const toast =
    params.replied === "1"
      ? {
          type: "success" as const,
          message: t.toastReplySent,
        }
      : params.error
        ? {
            type: "error" as const,
            message:
              params.error === "missing_fields"
                ? t.errorsMissingFields
                : params.error === "invalid_workspace"
                  ? t.errorsInvalidWorkspace
                  : params.error === "invalid_post"
                    ? t.errorsInvalidPost
                    : params.error === "invalid_account"
                      ? t.errorsInvalidAccount
                      : params.error === "missing_token"
                        ? t.errorsMissingToken
                        : params.error === "missing_scope"
                          ? t.errorsMissingScope
                        : params.error === "reply_failed"
                          ? t.errorsReplyFailed
                          : t.errorsGeneric,
          }
        : null;

  return (
    <div className="mx-auto min-h-full max-w-[1400px] px-6 py-8 lg:px-8">
      <DashboardToast toast={toast} clearKeys={["replied", "repliedCommentId", "error"]} />

      {/* ─── Header ─── */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t.title}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t.description}
          </p>
        </div>
        <form action={buildCommentsHref({ lang: params.lang, account: selectedAccountId || null, sort: sortOrder, includeReplied, minUnanswered })} method="get">
          <RefreshButton
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 cursor-pointer"
          />
        </form>
      </div>

      {/* ─── Filters ─── */}
      <form method="get" className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
        {params.lang ? <input type="hidden" name="lang" value={params.lang} /> : null}
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t.filtersTitle}
          </span>
          <span className="ml-auto text-xs text-slate-500">
            {t.activeWorkspace}: <span className="font-semibold text-slate-700">{activeWorkspace.name}</span>
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Account */}
          <select
            name="account"
            defaultValue={selectedAccountId || "all"}
            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-slate-300 cursor-pointer"
          >
            <option value="all">{t.allAccounts}</option>
            {accountOptions.map((account) => (
              <option key={account.id} value={account.id}>
                {getConnectedAccountDisplayLabel(account)}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            name="sort"
            defaultValue={sortOrder}
            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-slate-300 cursor-pointer"
          >
            <option value="newest">{t.newest}</option>
            <option value="oldest">{t.oldest}</option>
          </select>

          {/* Min unanswered */}
          <input
            type="number"
            name="minUnanswered"
            min={0}
            defaultValue={minUnanswered}
            placeholder={t.minUnansweredLabel}
            className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none focus:border-slate-300"
          />

          {/* Include replied */}
          <label className="flex items-center gap-2 h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              name="includeReplied"
              value="1"
              defaultChecked={includeReplied}
              className="h-4 w-4 rounded border-slate-300 text-slate-900 cursor-pointer"
            />
            <span className="truncate">{t.includeRepliedLabel}</span>
          </label>

          {/* Apply */}
          <FilterApplyButton label={t.refresh} />
        </div>
      </form>

      {/* ─── Stats bar ─── */}
      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-sm text-slate-500">
          {formatTemplate(t.visibleCommentsTemplate, {
            comments: visibleCommentCount,
            posts: filteredGroups.length,
          })}
        </p>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          {t.repliesSubmitHint}
        </div>
      </div>

      {/* ─── Content ─── */}
      {publishedPosts.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <MessagesSquare className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">{t.noPublishedPosts}</p>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
          <MessageCircle className="mx-auto h-8 w-8 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">{t.noCommentsMatching}</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredGroups.map((group) => (
            <article
              key={group.postId}
              className="rounded-2xl border border-slate-200 bg-white overflow-hidden flex flex-col h-[720px]"
            >
              {/* ── Post header: original post prominently shown ── */}
              <div className="draft-scroll-area shrink-0 max-h-[280px] overflow-y-auto p-5 border-b border-slate-100">
                <div className="flex items-start gap-3">
                  <ConnectedAccountAvatar
                    account={group.connectedAccount}
                    size={36}
                    initialsClassName="text-[11px]"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {getConnectedAccountDisplayLabel(group.connectedAccount)}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        {group.unansweredCount > 0 && (
                          <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            {group.unansweredCount}
                          </span>
                        )}
                        {group.postUrl && (
                          <a
                            href={group.postUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center rounded-lg p-1.5 hover:bg-slate-100 transition cursor-pointer"
                          >
                            <ExternalLink className="h-3.5 w-3.5 text-slate-400" />
                          </a>
                        )}
                      </div>
                    </div>
                    {/* Original post text — shown prominently */}
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                      {group.postText}
                    </p>
                    <div className="mt-3 flex items-center gap-4 text-[11px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {getFormattableDate(group.publishedAt, intlLocale)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {formatTemplate(t.commentsUnansweredTemplate, {
                          comments: group.moderationComments.length,
                          unanswered: group.unansweredCount,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Comments list ── */}
              <div className="draft-scroll-area flex-1 overflow-y-auto p-5 space-y-3">
                {group.moderationComments
                  .map((entry) => (
                    <CommentThread
                      key={entry.comment.id}
                      group={group}
                      comment={entry.comment}
                      locale={intlLocale}
                      currentFiltersHref={redirectHref}
                      labels={{
                        replied: t.repliedBadge,
                        unanswered: t.unansweredBadge,
                        openComment: t.openComment,
                        replyPlaceholder: t.writeReplyPlaceholder,
                        replyHint: t.replyHint,
                        replyButton: t.replyButton,
                        replyScopeRequired: t.errorsMissingScope,
                      }}
                      replied={entry.replied}
                      showReplyForm
                      depth={0}
                    />
                  ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
