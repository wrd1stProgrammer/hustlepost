import "server-only";

import type { GeneratedHookRecord } from "@/lib/types/marketing";
import type { ScheduledPostRecord, SupportedPlatform } from "@/lib/types/db";
import { createSupabaseServerClient } from "@/utils/supabase/server";

const GENERATED_HOOKS_SELECT =
  "id, category, keyword, platform_target, source_post_ids, output_text, output_reply_text, output_reply_texts, output_style, generation_model, prompt_snapshot, created_at";
const GENERATED_HOOKS_FALLBACK_SELECT =
  "id, category, keyword, platform_target, source_post_ids, output_text, output_style, generation_model, prompt_snapshot, created_at";

function isMissingOutputReplyTextColumnError(error: { message?: string } | null) {
  return Boolean(
    error?.message?.includes("output_reply_text") ||
      error?.message?.includes("output_reply_texts"),
  );
}

export async function createGeneratedHook(input: {
  userId: string;
  category: string;
  keyword: string;
  platformTargets: SupportedPlatform[];
  sourcePostIds: string[];
  outputText: string;
  outputReplyText?: string | null;
  outputReplyTexts?: string[] | null;
  promptSnapshot: Record<string, unknown>;
  outputStyle?: string;
  generationModel: string;
}) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("generated_hooks")
    .insert({
      user_id: input.userId,
      category: input.category,
      keyword: input.keyword,
      platform_target: input.platformTargets,
      source_post_ids: input.sourcePostIds,
      output_text: input.outputText,
      output_reply_text: input.outputReplyText ?? null,
      output_reply_texts: input.outputReplyTexts ?? null,
      prompt_snapshot: input.promptSnapshot,
      output_style: input.outputStyle ?? "broetry",
      generation_model: input.generationModel,
    })
    .select(GENERATED_HOOKS_SELECT)
    .single<GeneratedHookRecord>();

  if (isMissingOutputReplyTextColumnError(error)) {
    const { output_reply_text, output_reply_texts, ...fallbackPayload } = {
      user_id: input.userId,
      category: input.category,
      keyword: input.keyword,
      platform_target: input.platformTargets,
      source_post_ids: input.sourcePostIds,
      output_text: input.outputText,
      output_reply_text: input.outputReplyText ?? null,
      output_reply_texts: input.outputReplyTexts ?? null,
      prompt_snapshot: input.promptSnapshot,
      output_style: input.outputStyle ?? "broetry",
      generation_model: input.generationModel,
    };

    const { data: fallbackData, error: fallbackError } = await supabase
      .from("generated_hooks")
      .insert(fallbackPayload)
      .select(GENERATED_HOOKS_FALLBACK_SELECT)
      .single<GeneratedHookRecord>();

    if (fallbackError) {
      throw fallbackError;
    }

    return fallbackData;
  }

  if (error) {
    throw error;
  }

  return data;
}

export async function listGeneratedHooks(userId: string, limit = 8) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("generated_hooks")
    .select(GENERATED_HOOKS_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  let hooksData: unknown[] | null = (data ?? null) as unknown[] | null;

  if (isMissingOutputReplyTextColumnError(error)) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("generated_hooks")
      .select(GENERATED_HOOKS_FALLBACK_SELECT)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (fallbackError) {
      throw fallbackError;
    }

    hooksData = fallbackData;
  }

  if (error && !isMissingOutputReplyTextColumnError(error)) {
    throw error;
  }

  const hooks = (hooksData ?? []) as GeneratedHookRecord[];

  if (hooks.length === 0) {
    return hooks;
  }

  const hookIds = hooks.map((hook) => hook.id);
  const { data: scheduledPosts, error: scheduledPostsError } = await supabase
    .from("scheduled_posts")
    .select("generated_hook_id, connected_account_id, status, updated_at")
    .in("generated_hook_id", hookIds)
    .order("updated_at", { ascending: false });

  if (scheduledPostsError) {
    throw scheduledPostsError;
  }

  type ScheduledPostPublishRow = {
    generated_hook_id: string | null;
    connected_account_id: string;
    status: ScheduledPostRecord["status"];
    updated_at: string;
  };

  const publishMetaByHookId = new Map<
    string,
    {
      isPublished: boolean;
      publishedAt: string | null;
      publishedAccountIds: string[];
    }
  >();

  for (const row of (scheduledPosts ?? []) as ScheduledPostPublishRow[]) {
    if (!row.generated_hook_id) continue;

    const current = publishMetaByHookId.get(row.generated_hook_id) ?? {
      isPublished: false,
      publishedAt: null,
      publishedAccountIds: [],
    };

    if (row.status === "published") {
      current.isPublished = true;
      current.publishedAt = current.publishedAt ?? row.updated_at;

      if (!current.publishedAccountIds.includes(row.connected_account_id)) {
        current.publishedAccountIds.push(row.connected_account_id);
      }
    }

    publishMetaByHookId.set(row.generated_hook_id, current);
  }

  return hooks.map((hook) => {
    const publishMeta = publishMetaByHookId.get(hook.id);

    return {
      ...hook,
      is_published: publishMeta?.isPublished ?? false,
      published_at: publishMeta?.publishedAt ?? null,
      published_account_ids: publishMeta?.publishedAccountIds ?? [],
    };
  });
}
