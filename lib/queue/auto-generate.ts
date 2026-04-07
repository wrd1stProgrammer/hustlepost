import "server-only";

import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import {
  buildProductReplyTexts,
  generateTypedThreadsDrafts,
  type ThreadsDraftType,
} from "@/lib/ai/hooks";
import type { ViralCategory } from "@/lib/constants/marketing";
import { QUEUE_GENERATED_HOOK_STYLE_BY_DRAFT_TYPE, type QueueAiDraftType } from "@/lib/types/queue";
import type { ViralPostSummary } from "@/lib/types/marketing";
import {
  getDefaultScraperAccountForCluster,
  inferTopicClusterFromKeywords,
  triggerSearchIngestion,
  type WorkerTopicCluster,
} from "@/lib/openclaw/ingestion";
import {
  listWorkspaceUsedSourcePostIdsAdmin,
  markWorkspaceSourcePostsUsedAdmin,
} from "@/lib/db/workspace-source-usage";

type DraftOutputLanguage = "en" | "ko";

export type GenerateQueueDraftsInput = {
  userId: string;
  workspaceId: string;
  sourceMode: "ai_type" | "ai_random" | "draft_random";
  aiDraftType: QueueAiDraftType | null;
};

export type GenerateQueueDraftsResult = {
  userId: string;
  workspaceId: string;
  sourceMode: GenerateQueueDraftsInput["sourceMode"];
  aiDraftType: QueueAiDraftType | null;
  generatedCount: number;
  generatedHookIds: string[];
  selectedSourcePostIds: string[];
  requestedCounts: Record<ThreadsDraftType, number>;
  sourcePostCount: number;
  minimumSharedSourceCount: number;
  ingestionTriggered: boolean;
  topicCluster: WorkerTopicCluster | null;
  promptCategory: ViralCategory | null;
  workspaceName: string | null;
  workspaceKeywords: string[];
  outputLanguage: DraftOutputLanguage | null;
};

type WorkspaceCustomization = {
  targetAudience: string;
  productLink: string;
  commonInstruction: string;
  informationalFocus: string;
  engagementFocus: string;
  productFocus: string;
};

type WorkspaceContext = {
  id: string;
  name: string;
  keywords: string[];
  customization: WorkspaceCustomization;
};

type WorkspaceRow = {
  id: string;
  name: string;
  target_audience: string | null;
  product_link: string | null;
  common_instruction: string | null;
  informational_focus: string | null;
  engagement_focus: string | null;
  product_focus: string | null;
};

type WorkspaceKeywordRow = {
  keyword: string;
  position: number;
};

type SourcePostRow = ViralPostSummary & {
  normalized_metrics?: Record<string, unknown> | null;
};

const KOREAN_RE = /[ㄱ-ㅎㅏ-ㅣ가-힣]/;

function normalizeKeyword(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeKeywords(keywords: string[]) {
  return keywords
    .map((keyword) => normalizeKeyword(keyword))
    .filter(Boolean)
    .filter((keyword, index, items) => items.indexOf(keyword) === index)
    .slice(0, 3);
}

function normalizeText(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function inferOutputLanguage(values: string[]): DraftOutputLanguage {
  return values.some((value) => KOREAN_RE.test(value)) ? "ko" : "en";
}

function getPromptCategory(topicCluster: WorkerTopicCluster): ViralCategory {
  return topicCluster === "health_fitness" ? "fitness_diet" : "vibe_coding";
}

function getRequestedCounts(input: GenerateQueueDraftsInput): Record<ThreadsDraftType, number> {
  if (input.sourceMode === "draft_random") {
    return {
      informational: 0,
      engagement: 0,
      product: 0,
    };
  }

  if (input.sourceMode === "ai_random") {
    return {
      informational: 5,
      engagement: 5,
      product: 5,
    };
  }

  const draftType = input.aiDraftType ?? "informational";
  return {
    informational: draftType === "informational" ? 10 : 0,
    engagement: draftType === "engagement" ? 10 : 0,
    product: draftType === "product" ? 10 : 0,
  };
}

function sumRequestedCounts(counts: Record<ThreadsDraftType, number>) {
  return counts.informational + counts.engagement + counts.product;
}

async function loadWorkspaceContext(input: {
  userId: string;
  workspaceId: string;
}): Promise<WorkspaceContext> {
  const admin = createSupabaseAdminClient();

  const { data: workspace, error: workspaceError } = await admin
    .from("workspaces")
    .select(
      "id, name, target_audience, product_link, common_instruction, informational_focus, engagement_focus, product_focus",
    )
    .eq("id", input.workspaceId)
    .eq("user_id", input.userId)
    .maybeSingle<WorkspaceRow>();

  if (workspaceError) {
    throw workspaceError;
  }

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const { data: keywords, error: keywordsError } = await admin
    .from("workspace_keywords")
    .select("keyword, position")
    .eq("workspace_id", input.workspaceId)
    .order("position", { ascending: true })
    .limit(3);

  if (keywordsError) {
    throw keywordsError;
  }

  const normalizedKeywords = (keywords ?? [])
    .map((row) => normalizeKeyword((row as WorkspaceKeywordRow).keyword))
    .filter(Boolean)
    .slice(0, 3);

  return {
    id: workspace.id,
    name: normalizeText(workspace.name) || "workspace",
    keywords: normalizedKeywords,
    customization: {
      targetAudience: normalizeText(workspace.target_audience),
      productLink: normalizeText(workspace.product_link),
      commonInstruction: normalizeText(workspace.common_instruction),
      informationalFocus: normalizeText(workspace.informational_focus),
      engagementFocus: normalizeText(workspace.engagement_focus),
      productFocus: normalizeText(workspace.product_focus),
    },
  };
}

function rankSourcePosts(left: SourcePostRow, right: SourcePostRow) {
  const leftScore = left.virality_score ?? -1;
  const rightScore = right.virality_score ?? -1;

  if (leftScore !== rightScore) {
    return rightScore - leftScore;
  }

  const leftPublished = left.published_at ? new Date(left.published_at).getTime() : 0;
  const rightPublished = right.published_at ? new Date(right.published_at).getTime() : 0;

  return rightPublished - leftPublished;
}

async function searchSourcePosts(input: {
  keywords: string[];
  topicCluster: WorkerTopicCluster;
  excludePostIds: string[];
  limit: number;
}) {
  const admin = createSupabaseAdminClient();
  const keywords = normalizeKeywords(input.keywords);
  const excludedPostIds = new Set(
    input.excludePostIds.map((value) => normalizeText(value)).filter(Boolean),
  );
  const totalLimit = Math.min(Math.max(input.limit, 1), 120);

  if (keywords.length === 0) {
    return [] as SourcePostRow[];
  }

  const perKeywordLimit = Math.max(
    Math.ceil((totalLimit + Math.min(excludedPostIds.size, 90)) / keywords.length),
    1,
  );

  const collected = new Map<string, SourcePostRow>();

  for (const keyword of keywords) {
    let query = admin
      .from("viral_posts")
      .select(
        "id, platform, source_url, author_handle, author_name, category, content_text, view_count, like_count, published_at, virality_score, normalized_metrics",
      )
      .eq("platform", "threads")
      .order("virality_score", { ascending: false, nullsFirst: false })
      .order("published_at", { ascending: false, nullsFirst: false })
      .ilike("content_text", `%${keyword}%`)
      .limit(perKeywordLimit);

    query = query.eq("normalized_metrics->>topic_cluster", input.topicCluster);

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    for (const row of (data ?? []) as SourcePostRow[]) {
      if (excludedPostIds.has(row.id)) {
        continue;
      }

      if (!collected.has(row.id)) {
        collected.set(row.id, row);
      }
    }
  }

  return Array.from(collected.values()).sort(rankSourcePosts).slice(0, totalLimit);
}

function toPromptSourcePosts(sourcePosts: SourcePostRow[], promptCategory: ViralCategory) {
  return sourcePosts.map((post) => ({
    ...post,
    category: promptCategory,
  })) as ViralPostSummary[];
}

function flattenGeneratedDrafts(
  drafts: Record<ThreadsDraftType, string[]>,
  counts: Record<ThreadsDraftType, number>,
) {
  return (["informational", "engagement", "product"] as ThreadsDraftType[])
    .flatMap((draftType) =>
      (drafts[draftType] ?? [])
        .slice(0, counts[draftType])
        .map((outputText) => ({
          draftType,
          outputText: outputText.trim(),
        })),
    )
    .filter((entry) => Boolean(entry.outputText));
}

async function insertGeneratedHook(input: {
  userId: string;
  promptCategory: ViralCategory;
  keyword: string;
  outputStyle: string;
  outputText: string;
  outputReplyText: string | null;
  outputReplyTexts: string[] | null;
  sourcePostIds: string[];
  promptSnapshot: Record<string, unknown>;
}) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("generated_hooks")
    .insert({
      user_id: input.userId,
      category: input.promptCategory,
      keyword: input.keyword,
      platform_target: ["threads"],
      source_post_ids: input.sourcePostIds,
      output_text: input.outputText,
      output_reply_text: input.outputReplyText,
      output_reply_texts: input.outputReplyTexts,
      output_style: input.outputStyle,
      generation_model: "glm-4.7",
      prompt_snapshot: input.promptSnapshot,
    })
    .select("id")
    .single<{ id: string }>();

  if (error) {
    throw error;
  }

  return data.id;
}

export async function generateQueueDrafts(
  input: GenerateQueueDraftsInput,
): Promise<GenerateQueueDraftsResult> {
  if (input.sourceMode === "draft_random") {
    return {
      userId: input.userId,
      workspaceId: input.workspaceId,
      sourceMode: input.sourceMode,
      aiDraftType: input.aiDraftType,
      generatedCount: 0,
      generatedHookIds: [],
      selectedSourcePostIds: [],
      requestedCounts: {
        informational: 0,
        engagement: 0,
        product: 0,
      },
      sourcePostCount: 0,
      minimumSharedSourceCount: 0,
      ingestionTriggered: false,
      topicCluster: null,
      promptCategory: null,
      workspaceName: null,
      workspaceKeywords: [],
      outputLanguage: null,
    };
  }

  const workspace = await loadWorkspaceContext({
    userId: input.userId,
    workspaceId: input.workspaceId,
  });

  if (workspace.keywords.length === 0) {
    throw new Error("Workspace keywords are required");
  }

  const topicCluster = inferTopicClusterFromKeywords(workspace.keywords);
  const promptCategory = getPromptCategory(topicCluster);
  const outputLanguage = inferOutputLanguage([
    workspace.name,
    ...workspace.keywords,
    workspace.customization.targetAudience,
    workspace.customization.productLink,
    workspace.customization.commonInstruction,
    workspace.customization.informationalFocus,
    workspace.customization.engagementFocus,
    workspace.customization.productFocus,
  ]);
  const requestedCounts = getRequestedCounts(input);
  const requestedTotalCount = sumRequestedCounts(requestedCounts);
  const minimumSharedSourceCount =
    requestedTotalCount > 0 ? Math.max(2, Math.floor(requestedTotalCount / 2)) : 0;
  const libraryFetchCount = Math.max(minimumSharedSourceCount * 8, 24);
  const usedSourcePostIds = await listWorkspaceUsedSourcePostIdsAdmin(workspace.id);

  let ingestionTriggered = false;
  let sourcePosts = await searchSourcePosts({
    keywords: workspace.keywords,
    topicCluster,
    excludePostIds: usedSourcePostIds,
    limit: libraryFetchCount,
  });

  if (sourcePosts.length < minimumSharedSourceCount) {
    try {
      ingestionTriggered = true;
      await triggerSearchIngestion({
        keywords: workspace.keywords,
        topic_cluster: topicCluster,
        locale: outputLanguage,
        target_post_count: minimumSharedSourceCount,
        scraper_account: getDefaultScraperAccountForCluster(topicCluster),
      });

      sourcePosts = await searchSourcePosts({
        keywords: workspace.keywords,
        topicCluster,
        excludePostIds: usedSourcePostIds,
        limit: libraryFetchCount,
      });
    } catch (error) {
      console.error("[generateQueueDrafts] search ingestion failed", {
        workspaceId: workspace.id,
        topicCluster,
        keywords: workspace.keywords,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (sourcePosts.length === 0) {
    throw new Error("No viral posts available for queue generation");
  }

  const selectedSourcePosts = sourcePosts.slice(0, minimumSharedSourceCount || sourcePosts.length);
  const selectedSourcePostIds = selectedSourcePosts.map((post) => post.id);
  const generation = await generateTypedThreadsDrafts({
    keywords: workspace.keywords,
    sourcePosts: toPromptSourcePosts(selectedSourcePosts, promptCategory),
    outputLanguage,
    audience:
      workspace.customization.targetAudience || `${workspace.name} followers`,
    accountLabel: workspace.name,
    targetAudience: workspace.customization.targetAudience || undefined,
    productLink: workspace.customization.productLink || undefined,
    commonInstruction: workspace.customization.commonInstruction || undefined,
    informationalFocus: workspace.customization.informationalFocus || undefined,
    engagementFocus: workspace.customization.engagementFocus || undefined,
    productFocus: workspace.customization.productFocus || undefined,
    counts: requestedCounts,
  });

  const draftEntries = flattenGeneratedDrafts(generation.drafts, requestedCounts);

  if (draftEntries.length === 0) {
    throw new Error("No generated drafts were returned");
  }

  const generatedHookIds: string[] = [];

  for (const draftEntry of draftEntries) {
    const outputReplyTexts =
      draftEntry.draftType === "product"
        ? buildProductReplyTexts({
            productLink: workspace.customization.productLink,
            accountLabel: workspace.name,
            targetAudience: workspace.customization.targetAudience,
            outputLanguage,
          })
        : [];

    const generatedHookId = await insertGeneratedHook({
      userId: input.userId,
      promptCategory,
      keyword: workspace.keywords.join(", "),
      outputStyle: QUEUE_GENERATED_HOOK_STYLE_BY_DRAFT_TYPE[draftEntry.draftType],
      outputText: draftEntry.outputText,
      outputReplyText: outputReplyTexts[0] ?? null,
      outputReplyTexts: outputReplyTexts.length > 0 ? outputReplyTexts : null,
      sourcePostIds: selectedSourcePostIds,
      promptSnapshot: {
        workspace_id: workspace.id,
        workspace_name: workspace.name,
        draft_type: draftEntry.draftType,
        topic_cluster: topicCluster,
        source_mode: input.sourceMode,
        ai_draft_type: input.aiDraftType ?? null,
        keywords: workspace.keywords,
        workspace_customization: workspace.customization,
        selected_source_post_ids: selectedSourcePostIds,
        source_post_count: selectedSourcePostIds.length,
        output_language: outputLanguage,
        thread_reply_text: outputReplyTexts[0] ?? null,
        thread_reply_texts: outputReplyTexts.length > 0 ? outputReplyTexts : null,
        raw_generation: generation.raw,
      },
    });

    generatedHookIds.push(generatedHookId);
  }

  try {
    await markWorkspaceSourcePostsUsedAdmin({
      workspaceId: workspace.id,
      sourcePostIds: selectedSourcePostIds,
    });
  } catch (error) {
    console.error("[generateQueueDrafts] source usage mark failed", {
      workspaceId: workspace.id,
      sourcePostIds: selectedSourcePostIds,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  return {
    userId: input.userId,
    workspaceId: workspace.id,
    sourceMode: input.sourceMode,
    aiDraftType: input.aiDraftType,
    generatedCount: generatedHookIds.length,
    generatedHookIds,
    selectedSourcePostIds,
    requestedCounts,
    sourcePostCount: selectedSourcePosts.length,
    minimumSharedSourceCount,
    ingestionTriggered,
    topicCluster,
    promptCategory,
    workspaceName: workspace.name,
    workspaceKeywords: workspace.keywords,
    outputLanguage,
  };
}
