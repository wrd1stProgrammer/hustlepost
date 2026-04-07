import "server-only";

import crypto from "node:crypto";
import type {
  CreateScheduledPostInput,
  ConnectedAccountRecord,
  PublishRunSummary,
  PublishViewMetricsSummary,
  ScheduledPostRecord,
} from "@/lib/types/db";
import { decryptSecret } from "@/lib/crypto";
import { getThreadsMediaInsights } from "@/lib/platforms/threads";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { createSupabaseServerClient } from "@/utils/supabase/server";

const REPLY_CHAIN_PREFIX = "__PB_REPLY_CHAIN__:";
const THREADS_VIEW_METRICS_KEY = "threads_view_metrics";
const THREADS_VIEW_METRICS_REFRESH_MS = 60 * 60 * 1000;
const THREADS_VIEW_METRICS_RETRY_MS = 15 * 60 * 1000;

function isMissingReplyTextsColumnError(error: { message?: string } | null) {
  return Boolean(error?.message?.includes("reply_texts"));
}

function isMissingImageUrlsColumnError(error: { message?: string } | null) {
  return Boolean(error?.message?.includes("image_urls"));
}

function isMissingDeletedColumnsError(error: { message?: string } | null) {
  return Boolean(
    error?.message?.includes("deleted_at") || error?.message?.includes("deleted_source"),
  );
}

function serializeReplyTextsFallback(replyTexts: string[]) {
  if (replyTexts.length === 0) return null;
  if (replyTexts.length === 1) return replyTexts[0];
  return `${REPLY_CHAIN_PREFIX}${JSON.stringify(replyTexts)}`;
}

function parseReplyTextsFallback(
  replyTexts: string[] | null | undefined,
  replyText: string | null | undefined,
) {
  if (Array.isArray(replyTexts) && replyTexts.length > 0) {
    return replyTexts;
  }

  if (!replyText) {
    return null;
  }

  if (!replyText.startsWith(REPLY_CHAIN_PREFIX)) {
    return [replyText];
  }

  try {
    const parsed = JSON.parse(replyText.slice(REPLY_CHAIN_PREFIX.length)) as unknown;
    if (Array.isArray(parsed)) {
      return parsed
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter(Boolean)
        .slice(0, 3);
    }
  } catch {
    return null;
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function parseStoredThreadsViewMetrics(
  responsePayload: unknown,
): PublishViewMetricsSummary | null {
  if (!isRecord(responsePayload)) {
    return null;
  }

  const candidate =
    responsePayload[THREADS_VIEW_METRICS_KEY] ??
    responsePayload.threads_insights ??
    responsePayload.threads_view_count;

  if (!isRecord(candidate)) {
    return null;
  }

  const sourceValue = candidate.source;

  if (
    sourceValue !== "cached" &&
    sourceValue !== "permission_denied" &&
    sourceValue !== "unavailable"
  ) {
    return null;
  }

  const views = typeof candidate.views === "number" ? candidate.views : null;
  const fetched_at =
    typeof candidate.fetched_at === "string" ? candidate.fetched_at : null;

  return {
    views,
    source: sourceValue as PublishViewMetricsSummary["source"],
    fetched_at,
  };
}

function buildThreadsViewMetricsPayload(
  metrics: PublishViewMetricsSummary,
): Record<string, unknown> {
  return {
    views: metrics.views,
    source: metrics.source,
    fetched_at: metrics.fetched_at,
  };
}

function isFreshThreadsViewMetrics(metrics: PublishViewMetricsSummary | null) {
  if (!metrics?.fetched_at) {
    return false;
  }

  const fetchedAt = new Date(metrics.fetched_at).getTime();
  if (Number.isNaN(fetchedAt)) {
    return false;
  }

  const age = Date.now() - fetchedAt;
  if (metrics.source === "permission_denied" || metrics.source === "unavailable") {
    return age < THREADS_VIEW_METRICS_RETRY_MS;
  }

  return age < THREADS_VIEW_METRICS_REFRESH_MS;
}

export async function createScheduledPost(input: CreateScheduledPostInput) {
  const supabase = await createSupabaseServerClient();
  const normalizedImageUrls =
    input.imageUrls
      ?.map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 3) ?? [];
  const normalizedReplyTexts =
    input.replyTexts
      ?.map((value) => value.trim())
      .filter(Boolean)
      .slice(0, 3) ?? [];
  const fallbackReplyText =
    normalizedReplyTexts[0] ?? input.replyText?.trim() ?? null;

  const payload = {
    user_id: input.userId,
    connected_account_id: input.connectedAccountId,
    generated_hook_id: input.generatedHookId ?? null,
    workspace_id: input.workspaceId ?? null,
    platform: input.platform,
    post_text: input.postText,
    image_urls: normalizedImageUrls.length > 0 ? normalizedImageUrls : null,
    reply_text: fallbackReplyText,
    reply_texts: normalizedReplyTexts.length > 0 ? normalizedReplyTexts : null,
    scheduled_for: input.scheduledFor,
    timezone: input.timezone,
    status: input.status ?? "scheduled",
    idempotency_key: input.idempotencyKey,
  };

  const { data, error } = await supabase
    .from("scheduled_posts")
    .insert(payload)
    .select(
      "id, user_id, connected_account_id, generated_hook_id, workspace_id, platform, post_text, reply_text, reply_texts, scheduled_for, timezone, status, trigger_run_id, created_at, updated_at",
    )
    .single<ScheduledPostRecord>();

  if (isMissingReplyTextsColumnError(error) || isMissingImageUrlsColumnError(error)) {
    if (normalizedImageUrls.length > 0 && isMissingImageUrlsColumnError(error)) {
      throw new Error("scheduled_posts.image_urls column is missing");
    }

    const { reply_texts, image_urls, ...fallbackPayload } = payload;
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("scheduled_posts")
      .insert({
        ...fallbackPayload,
        reply_text: serializeReplyTextsFallback(normalizedReplyTexts),
      })
      .select(
        "id, user_id, connected_account_id, generated_hook_id, workspace_id, platform, post_text, reply_text, scheduled_for, timezone, status, trigger_run_id, created_at, updated_at",
      )
      .single<ScheduledPostRecord>();

    if (fallbackError) {
      throw fallbackError;
    }

    return {
      ...fallbackData,
      image_urls: null,
      reply_texts: parseReplyTextsFallback(null, fallbackData.reply_text),
    } as ScheduledPostRecord;
  }

  if (error) {
    throw error;
  }

  return data;
}

export async function listScheduledPosts(
  userId: string,
  options?: {
    workspaceId?: string | null;
    resolveViewMetrics?: boolean;
  },
) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("scheduled_posts")
    .select(
        `
      id,
      user_id,
      connected_account_id,
      generated_hook_id,
      workspace_id,
      platform,
      post_text,
      image_urls,
      reply_text,
      reply_texts,
      deleted_at,
      deleted_source,
      scheduled_for,
      timezone,
      status,
      trigger_run_id,
      created_at,
      updated_at,
      connected_account:connected_accounts (
        id,
        platform,
        platform_user_id,
        username,
        display_name,
        avatar_url,
        account_status
      )
    `,
    )
    .eq("user_id", userId);

  if (options?.workspaceId) {
    query = query.eq("workspace_id", options.workspaceId);
  }

  const { data, error } = await query.order("scheduled_for", { ascending: true });

  if (
    isMissingReplyTextsColumnError(error) ||
    isMissingImageUrlsColumnError(error) ||
    isMissingDeletedColumnsError(error)
  ) {
    let fallbackQuery = supabase
      .from("scheduled_posts")
      .select(
        `
      id,
      user_id,
      connected_account_id,
      generated_hook_id,
      workspace_id,
      platform,
      post_text,
      reply_text,
      deleted_at,
      deleted_source,
      scheduled_for,
      timezone,
      status,
      trigger_run_id,
      created_at,
      updated_at,
      connected_account:connected_accounts (
        id,
        platform,
        platform_user_id,
        username,
        display_name,
        avatar_url,
        account_status
      )
    `,
      )
      .eq("user_id", userId);

    if (options?.workspaceId) {
      fallbackQuery = fallbackQuery.eq("workspace_id", options.workspaceId);
    }

    const { data: fallbackData, error: fallbackError } = await fallbackQuery.order(
      "scheduled_for",
      { ascending: true },
    );

    if (fallbackError) {
      throw fallbackError;
    }

    const fallbackScheduledPosts = ((fallbackData ?? []) as ScheduledPostRow[]).map((post) => ({
      ...post,
      image_urls: null,
      reply_texts: parseReplyTextsFallback(null, post.reply_text),
      deleted_at: null,
      deleted_source: null,
      connected_account: Array.isArray(post.connected_account)
        ? post.connected_account[0] ?? null
        : post.connected_account ?? null,
      latest_publish_run: null,
    }));

    const postsWithPublishRuns = await attachLatestPublishRuns(
      supabase,
      fallbackScheduledPosts,
    );

    if (!options?.resolveViewMetrics) {
      return postsWithPublishRuns;
    }

    try {
      return await attachThreadsViewMetrics(supabase, postsWithPublishRuns);
    } catch {
      return postsWithPublishRuns.map((post) => ({
        ...post,
        view_metrics: null,
      }));
    }
  }

  if (error) {
    throw error;
  }

  type ScheduledPostRow = Omit<ScheduledPostRecord, "connected_account"> & {
    connected_account?: Pick<
      ConnectedAccountRecord,
      | "id"
      | "platform"
      | "platform_user_id"
      | "username"
      | "display_name"
      | "avatar_url"
      | "account_status"
    >[];
  };
  const scheduledPosts = ((data ?? []) as ScheduledPostRow[]).map((post) => ({
    ...post,
    connected_account: Array.isArray(post.connected_account)
      ? post.connected_account[0] ?? null
      : post.connected_account ?? null,
    latest_publish_run: null,
  }));

  const postsWithPublishRuns = await attachLatestPublishRuns(supabase, scheduledPosts);

  if (!options?.resolveViewMetrics) {
    return postsWithPublishRuns;
  }

  try {
    return await attachThreadsViewMetrics(supabase, postsWithPublishRuns);
  } catch {
    return postsWithPublishRuns.map((post) => ({
      ...post,
      view_metrics: null,
    }));
  }
}

async function attachLatestPublishRuns(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  scheduledPosts: ScheduledPostRecord[],
) {
  if (scheduledPosts.length === 0) {
    return scheduledPosts;
  }

  const scheduledPostIds = scheduledPosts.map((post) => post.id);
  const { data: publishRuns, error: publishRunsError } = await supabase
    .from("publish_runs")
    .select(
      "id, scheduled_post_id, status, error_code, error_message, external_post_id, external_post_url, response_payload, finished_at, started_at",
    )
    .in("scheduled_post_id", scheduledPostIds)
    .order("started_at", { ascending: false });

  if (publishRunsError) {
    throw publishRunsError;
  }

  const latestPublishRunByPostId = new Map<string, PublishRunSummary>();

  for (const run of publishRuns ?? []) {
    if (latestPublishRunByPostId.has(run.scheduled_post_id)) {
      continue;
    }

    latestPublishRunByPostId.set(run.scheduled_post_id, {
      id: run.id,
      status: run.status,
      error_code: run.error_code,
      error_message: run.error_message,
      external_post_id: run.external_post_id,
      external_post_url: run.external_post_url,
      finished_at: run.finished_at,
      response_payload: run.response_payload,
    });
  }

  return scheduledPosts.map((post) => ({
    ...post,
    latest_publish_run: latestPublishRunByPostId.get(post.id) ?? null,
  }));
}

async function attachThreadsViewMetrics(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  scheduledPosts: ScheduledPostRecord[],
) {
  const threadsPosts = scheduledPosts.filter(
    (post) =>
      post.platform === "threads" &&
      post.status === "published" &&
      Boolean(post.latest_publish_run?.external_post_id),
  );

  if (threadsPosts.length === 0) {
    return scheduledPosts;
  }

  const cachedMetricsByPostId = new Map<
    string,
    PublishViewMetricsSummary | null
  >();
  const postsNeedingRefresh: ScheduledPostRecord[] = [];

  for (const post of threadsPosts) {
    const cachedMetrics = parseStoredThreadsViewMetrics(
      post.latest_publish_run?.response_payload,
    );
    cachedMetricsByPostId.set(post.id, cachedMetrics);

    if (!isFreshThreadsViewMetrics(cachedMetrics)) {
      postsNeedingRefresh.push(post);
    }
  }

  if (postsNeedingRefresh.length === 0) {
    return scheduledPosts.map((post) => ({
      ...post,
      view_metrics: cachedMetricsByPostId.get(post.id) ?? null,
    }));
  }

  const connectedAccountIds = [
    ...new Set(
      postsNeedingRefresh
        .map((post) => post.connected_account_id)
        .filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  ];

  const { data: oauthTokens, error: oauthTokensError } = await supabase
    .from("oauth_tokens")
    .select("connected_account_id, access_token_ciphertext")
    .eq("platform", "threads")
    .in("connected_account_id", connectedAccountIds);

  if (oauthTokensError) {
    throw oauthTokensError;
  }

  const accessTokenByAccountId = new Map<string, string>();
  for (const token of (oauthTokens ?? []) as Array<{
    connected_account_id?: string;
    access_token_ciphertext?: string;
  }>) {
    if (
      typeof token.connected_account_id !== "string" ||
      typeof token.access_token_ciphertext !== "string"
    ) {
      continue;
    }

    try {
      accessTokenByAccountId.set(
        token.connected_account_id,
        decryptSecret(token.access_token_ciphertext),
      );
    } catch {
      // Ignore malformed secrets and fall back to cached or unavailable state.
    }
  }

  const admin = createSupabaseAdminClient();
  const resolvedMetricsByPostId = new Map<string, PublishViewMetricsSummary | null>();

  await Promise.all(
    postsNeedingRefresh.map(async (post) => {
      const publishRun = post.latest_publish_run;
      const cachedMetrics = cachedMetricsByPostId.get(post.id) ?? null;

      if (!publishRun?.external_post_id) {
        resolvedMetricsByPostId.set(post.id, cachedMetrics);
        return;
      }

      const accessToken = accessTokenByAccountId.get(post.connected_account_id);

      if (!accessToken) {
        resolvedMetricsByPostId.set(
          post.id,
          cachedMetrics ?? {
            views: null,
            source: "unavailable",
            fetched_at: new Date().toISOString(),
          },
        );
        return;
      }

      try {
        const result = await getThreadsMediaInsights({
          accessToken,
          mediaId: publishRun.external_post_id,
        });

        if (result.source === "cached") {
          const nextMetrics: PublishViewMetricsSummary = {
            views: result.views,
            source: "cached",
            fetched_at: result.fetched_at,
          };

          resolvedMetricsByPostId.set(post.id, nextMetrics);

          if (publishRun.id) {
            const nextResponsePayload = isRecord(publishRun.response_payload)
              ? { ...publishRun.response_payload }
              : {};
            nextResponsePayload[THREADS_VIEW_METRICS_KEY] = buildThreadsViewMetricsPayload(
              nextMetrics,
            );

            await admin
              .from("publish_runs")
              .update({
                response_payload: nextResponsePayload,
              })
              .eq("id", publishRun.id);
          }

          return;
        }

        if (result.source === "permission_denied") {
          const nextMetrics =
            cachedMetrics ?? {
              views: null,
              source: "permission_denied",
              fetched_at: result.fetched_at,
            };

          resolvedMetricsByPostId.set(post.id, nextMetrics);

          if (!cachedMetrics && publishRun.id) {
            const nextResponsePayload = isRecord(publishRun.response_payload)
              ? { ...publishRun.response_payload }
              : {};
            nextResponsePayload[THREADS_VIEW_METRICS_KEY] = buildThreadsViewMetricsPayload(
              nextMetrics,
            );

            await admin
              .from("publish_runs")
              .update({
                response_payload: nextResponsePayload,
              })
              .eq("id", publishRun.id);
          }

          return;
        }

        const nextMetrics =
          cachedMetrics ?? {
            views: null,
            source: "unavailable",
            fetched_at: result.fetched_at,
          };

        resolvedMetricsByPostId.set(post.id, nextMetrics);

        if (!cachedMetrics && publishRun.id) {
          const nextResponsePayload = isRecord(publishRun.response_payload)
            ? { ...publishRun.response_payload }
            : {};
          nextResponsePayload[THREADS_VIEW_METRICS_KEY] = buildThreadsViewMetricsPayload(
            nextMetrics,
          );

          await admin
            .from("publish_runs")
            .update({
              response_payload: nextResponsePayload,
            })
            .eq("id", publishRun.id);
        }
      } catch {
        resolvedMetricsByPostId.set(post.id, cachedMetrics);
      }
    }),
  );

  return scheduledPosts.map((post) => ({
    ...post,
    view_metrics: resolvedMetricsByPostId.get(post.id) ?? cachedMetricsByPostId.get(post.id) ?? null,
  }));
}

export async function getConnectedAccountForScheduling(input: {
  userId: string;
  connectedAccountId: string;
}) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("connected_accounts")
    .select("id, platform, username, display_name, account_status")
    .eq("id", input.connectedAccountId)
    .eq("user_id", input.userId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function attachTriggerRunId(input: {
  scheduledPostId: string;
  triggerRunId: string;
}) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("scheduled_posts")
    .update({
      trigger_run_id: input.triggerRunId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.scheduledPostId);

  if (error) {
    throw error;
  }
}

export async function markScheduledPostDeleted(input: {
  scheduledPostId: string;
  source: "app" | "external";
}) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("scheduled_posts")
    .update({
      deleted_at: new Date().toISOString(),
      deleted_source: input.source,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.scheduledPostId);

  if (error) {
    throw error;
  }
}

export function createScheduledPostIdempotencyKey() {
  return `scheduled-post:${crypto.randomUUID()}`;
}
