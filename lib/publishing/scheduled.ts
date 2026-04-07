import "server-only";

import { AbortTaskRunError } from "@trigger.dev/sdk";
import { decryptSecret } from "@/lib/crypto";
import { publishThreadsTextPost } from "@/lib/platforms/threads";
import { publishXTextPost } from "@/lib/platforms/x";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";

type PublishFailureDetails = {
  code: string | null;
  message: string;
  shouldAbort: boolean;
};

type ScheduledPostForPublish = {
  id: string;
  connected_account_id: string;
  platform: "x" | "threads";
  post_text: string;
  image_urls?: string[] | null;
  reply_text: string | null;
  reply_texts?: string[] | null;
  status: string;
  scheduled_for: string;
};

const REPLY_CHAIN_PREFIX = "__PB_REPLY_CHAIN__:";
const THREADS_REPLY_RETRY_DELAYS_MS = [1200, 2500, 4000];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown publish failure";
}

function parseJsonObject(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function classifyPublishFailure(error: unknown): PublishFailureDetails {
  const message = getErrorMessage(error);
  const match = message.match(
    /(?:X|Threads)(?: container creation)?(?: publish)? failed:\s*(\{.*\})$/,
  );
  const parsed = match ? parseJsonObject(match[1]) : null;
  const title = typeof parsed?.title === "string" ? parsed.title : null;
  const detail = typeof parsed?.detail === "string" ? parsed.detail : null;
  const errorType =
    typeof parsed?.error === "object" && parsed.error
      ? parsed.error
      : parsed;
  const nestedType =
    errorType && typeof errorType === "object"
      ? typeof (errorType as Record<string, unknown>).type === "string"
        ? ((errorType as Record<string, unknown>).type as string)
        : null
      : null;
  const nestedMessage =
    errorType && typeof errorType === "object"
      ? typeof (errorType as Record<string, unknown>).message === "string"
        ? ((errorType as Record<string, unknown>).message as string)
        : null
      : null;

  if (title === "CreditsDepleted") {
    return {
      code: "credits_depleted",
      message: detail ?? "X API credits are depleted.",
      shouldAbort: true,
    };
  }

  if (
    title === "Unauthorized" ||
    nestedType === "OAuthException" ||
    /invalid token|invalid_grant|unauthorized|forbidden|oauth/i.test(message)
  ) {
    return {
      code: "token_invalid",
      message:
        detail ??
        nestedMessage ??
        "The connected account token is invalid or expired.",
      shouldAbort: true,
    };
  }

  if (title === "RateLimitExceeded" || /rate limit|too many requests/i.test(message)) {
    return {
      code: "rate_limited",
      message: detail ?? message,
      shouldAbort: false,
    };
  }

  if (/application does not have the capability|permission|not authorized/i.test(message)) {
    return {
      code: "permission_denied",
      message: detail ?? nestedMessage ?? message,
      shouldAbort: true,
    };
  }

  return {
    code: title ? title.toLowerCase() : "publish_failed",
    message: detail ?? nestedMessage ?? message,
    shouldAbort: false,
  };
}

function isMissingReplyTextsColumnError(error: { message?: string } | null) {
  return Boolean(error?.message?.includes("reply_texts"));
}

function isMissingImageUrlsColumnError(error: { message?: string } | null) {
  return Boolean(error?.message?.includes("image_urls"));
}

function parseReplyTexts(
  replyTexts: string[] | null | undefined,
  replyText: string | null | undefined,
) {
  if (Array.isArray(replyTexts) && replyTexts.length > 0) {
    return replyTexts;
  }

  if (!replyText) {
    return [];
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
    return [];
  }

  return [];
}

async function publishThreadsReplyChain(input: {
  accessToken: string;
  username: string | null | undefined;
  rootPostId: string;
  replyTexts: string[];
}) {
  const results: Awaited<ReturnType<typeof publishThreadsTextPost>>[] = [];
  let parentPostId = input.rootPostId;

  for (const [replyIndex, replyText] of input.replyTexts.entries()) {
    let lastError: unknown = null;

    for (const [attemptIndex, delayMs] of THREADS_REPLY_RETRY_DELAYS_MS.entries()) {
      try {
        if (delayMs > 0) {
          await sleep(delayMs);
        }

        const replyResult = await publishThreadsTextPost({
          accessToken: input.accessToken,
          text: replyText,
          username: input.username,
          replyToId: parentPostId,
        });

        results.push(replyResult);
        parentPostId = replyResult.externalPostId;
        lastError = null;
        break;
      } catch (error) {
        lastError = error;
        console.error("[publishScheduledPost] Threads reply publish failed", {
          replyIndex,
          attempt: attemptIndex + 1,
          replyToId: parentPostId,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }

    if (lastError) {
      throw lastError;
    }
  }

  return results;
}

export async function publishScheduledPost(input: {
  scheduledPostId: string;
  platform: "x" | "threads";
}) {
  const admin = createSupabaseAdminClient();

  const scheduledPostSelect =
    "id, connected_account_id, platform, post_text, image_urls, reply_text, reply_texts, status, scheduled_for";
  const scheduledPostFallbackSelect =
    "id, connected_account_id, platform, post_text, reply_text, status, scheduled_for";

  let { data: scheduledPost, error: scheduledPostError } = await admin
    .from("scheduled_posts")
    .select(scheduledPostSelect)
    .eq("id", input.scheduledPostId)
    .single<ScheduledPostForPublish>();

  if (
    isMissingReplyTextsColumnError(scheduledPostError) ||
    isMissingImageUrlsColumnError(scheduledPostError)
  ) {
    const fallbackResult = await admin
      .from("scheduled_posts")
      .select(scheduledPostFallbackSelect)
      .eq("id", input.scheduledPostId)
      .single<ScheduledPostForPublish>();

    scheduledPost = fallbackResult.data;
    scheduledPostError = fallbackResult.error;
  }

  if (scheduledPostError || !scheduledPost) {
    throw scheduledPostError ?? new Error("Scheduled post not found");
  }

  if (scheduledPost.status === "published") {
    return { skipped: true, reason: "already_published" } as const;
  }

  if (scheduledPost.status === "cancelled") {
    throw new AbortTaskRunError("Scheduled post was cancelled before execution");
  }

  const { data: account, error: accountError } = await admin
    .from("connected_accounts")
    .select("id, username, platform")
    .eq("id", scheduledPost.connected_account_id)
    .single();

  if (accountError || !account) {
    throw accountError ?? new Error("Connected account not found");
  }

  const { data: token, error: tokenError } = await admin
    .from("oauth_tokens")
    .select("access_token_ciphertext")
    .eq("connected_account_id", scheduledPost.connected_account_id)
    .eq("platform", scheduledPost.platform)
    .single();

  if (tokenError || !token) {
    throw tokenError ?? new Error("OAuth token not found");
  }

  const { data: publishRun, error: publishRunError } = await admin
    .from("publish_runs")
    .insert({
      scheduled_post_id: scheduledPost.id,
      connected_account_id: scheduledPost.connected_account_id,
      platform: scheduledPost.platform,
      request_payload: {
        text: scheduledPost.post_text,
        image_urls:
          Array.isArray(scheduledPost.image_urls) && scheduledPost.image_urls.length > 0
            ? scheduledPost.image_urls
            : null,
        reply_text: scheduledPost.reply_text ?? null,
        reply_texts:
          Array.isArray(scheduledPost.reply_texts) && scheduledPost.reply_texts.length > 0
            ? scheduledPost.reply_texts
            : null,
        scheduled_for: scheduledPost.scheduled_for,
      },
      status: "running",
    })
    .select("id")
    .single();

  if (publishRunError || !publishRun) {
    throw publishRunError ?? new Error("Failed to create publish run");
  }

  await admin
    .from("scheduled_posts")
    .update({
      status: "processing",
      updated_at: new Date().toISOString(),
    })
    .eq("id", scheduledPost.id);

  try {
    const accessToken = decryptSecret(token.access_token_ciphertext);
    const result =
      scheduledPost.platform === "x"
        ? await publishXTextPost({
            accessToken,
            text: scheduledPost.post_text,
            username: account.username,
          })
        : await publishThreadsTextPost({
            accessToken,
            text: scheduledPost.post_text,
            username: account.username,
            imageUrls: scheduledPost.image_urls,
          });

    const replyTexts = parseReplyTexts(
      scheduledPost.reply_texts,
      typeof scheduledPost.reply_text === "string" ? scheduledPost.reply_text.trim() : null,
    );

    const replyResults =
      scheduledPost.platform === "threads" && replyTexts.length > 0
        ? await publishThreadsReplyChain({
            accessToken,
            username: account.username,
            rootPostId: result.externalPostId,
            replyTexts,
          })
        : [];

    await admin
      .from("publish_runs")
      .update({
        status: "success",
        external_post_id: result.externalPostId,
        external_post_url: result.externalPostUrl,
        response_payload: {
          root: result.raw,
          replies: replyResults.map((entry) => entry.raw),
          reply_external_post_ids: replyResults.map((entry) => entry.externalPostId),
          reply_external_post_urls: replyResults.map(
            (entry) => entry.externalPostUrl,
          ),
        },
        finished_at: new Date().toISOString(),
      })
      .eq("id", publishRun.id);

    await admin
      .from("scheduled_posts")
      .update({
        status: "published",
        updated_at: new Date().toISOString(),
      })
      .eq("id", scheduledPost.id);

    return result;
  } catch (error) {
    const failure = classifyPublishFailure(error);

    await admin
      .from("publish_runs")
      .update({
        status: "failed",
        error_code: failure.code,
        error_message: failure.message,
        finished_at: new Date().toISOString(),
      })
      .eq("id", publishRun.id);

    await admin
      .from("scheduled_posts")
      .update({
        status: "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", scheduledPost.id);

    if (failure.shouldAbort) {
      throw new AbortTaskRunError(failure.message);
    }

    throw error;
  }
}
