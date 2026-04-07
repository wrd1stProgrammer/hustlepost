"use server";

import {
  buildProductReplyTexts,
  generateTypedThreadsDrafts,
  generateViralHooks,
} from "@/lib/ai";
import { setDraftGenerationStage } from "@/lib/ai/draft-generation-progress";
import { VIRAL_CATEGORIES, type ViralCategory } from "@/lib/constants/marketing";
import { tasks } from "@trigger.dev/sdk";
import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { decryptSecret } from "@/lib/crypto";
import {
  disconnectConnectedAccount,
  ensureProfile,
  getConnectedAccountWithKeywords,
  listConnectedAccountsWithKeywords,
  replaceAccountKeywords,
} from "@/lib/db/accounts";
import { createGeneratedHook } from "@/lib/db/generated-hooks";
import {
  listWorkspaceUsedSourcePostIds,
  markWorkspaceSourcePostsUsed,
} from "@/lib/db/workspace-source-usage";
import {
  attachTriggerRunId,
  createScheduledPost,
  createScheduledPostIdempotencyKey,
  getConnectedAccountForScheduling,
  markScheduledPostDeleted,
} from "@/lib/db/publishing";
import { publishScheduledPost as runImmediatePublish } from "@/lib/publishing/scheduled";
import { deleteThreadsMediaObject, getThreadsMediaObject } from "@/lib/platforms/threads";
import {
  searchThreadsViralPostsByKeywords,
  searchViralPosts,
} from "@/lib/db/viral-posts";
import {
  getDefaultScraperAccountForCluster,
  inferTopicClusterFromKeywords,
} from "@/lib/openclaw/ingestion";
import { triggerSearchIngestion } from "@/lib/openclaw/ingestion";
import { scheduledPublishTask } from "@/trigger/scheduled-publish";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import {
  deriveWorkspaceKeywordsFromAccounts,
  createWorkspaceRecord,
  getActiveWorkspace,
  getWorkspaceState,
  setActiveWorkspace,
  updateWorkspaceRecord,
} from "@/lib/dashboard/workspaces";
import { resolveLocale } from "@/lib/i18n/locales";

export async function signOutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

function isViralCategory(value: string): value is ViralCategory {
  return VIRAL_CATEGORIES.includes(value as ViralCategory);
}

function getFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function buildRedirectPath(
  redirectTo: string,
  nextParams: Record<string, string | number | boolean | null | undefined>,
) {
  const [pathname, rawQuery = ""] = redirectTo.split("?");
  const params = new URLSearchParams(rawQuery);

  for (const [key, value] of Object.entries(nextParams)) {
    if (value === null || value === undefined || value === "") {
      params.delete(key);
      continue;
    }

    params.set(key, String(value));
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

async function getThreadsDeleteTarget(input: {
  userId: string;
  scheduledPostId: string;
}) {
  const supabase = await createSupabaseServerClient();
  let { data: scheduledPost, error: scheduledPostError } = await supabase
    .from("scheduled_posts")
    .select(
      "id, user_id, connected_account_id, platform, status, deleted_at, deleted_source",
    )
    .eq("id", input.scheduledPostId)
    .eq("user_id", input.userId)
    .single();

  if (isMissingDeletedStateError(scheduledPostError)) {
    const fallbackResult = await supabase
      .from("scheduled_posts")
      .select("id, user_id, connected_account_id, platform, status")
      .eq("id", input.scheduledPostId)
      .eq("user_id", input.userId)
      .single();

    scheduledPost = fallbackResult.data
      ? {
          ...fallbackResult.data,
          deleted_at: null,
          deleted_source: null,
        }
      : null;
    scheduledPostError = fallbackResult.error;
  }

  if (scheduledPostError || !scheduledPost) {
    throw scheduledPostError ?? new Error("Scheduled post not found");
  }

  const { data: publishRun, error: publishRunError } = await supabase
    .from("publish_runs")
    .select(
      "id, external_post_id, external_post_url, status, finished_at, started_at",
    )
    .eq("scheduled_post_id", input.scheduledPostId)
    .eq("status", "success")
    .not("external_post_id", "is", null)
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (publishRunError) {
    throw publishRunError;
  }

  const { data: token, error: tokenError } = await supabase
    .from("oauth_tokens")
    .select("access_token_ciphertext, scopes")
    .eq("connected_account_id", scheduledPost.connected_account_id)
    .eq("platform", scheduledPost.platform)
    .single();

  if (tokenError || !token) {
    throw tokenError ?? new Error("OAuth token not found");
  }

  return {
    scheduledPost,
    publishRun,
    token,
  };
}

function hasThreadsDeleteScope(scopes: unknown) {
  return Array.isArray(scopes) && scopes.includes("threads_delete");
}

function isThreadsPermissionError(error: unknown) {
  return (
    error instanceof Error &&
    /application does not have permission|permission for this action|thapiexception|code\":10/i.test(
      error.message,
    )
  );
}

function isMissingDeletedStateError(error: unknown) {
  return (
    error instanceof Error &&
    (error.message.includes("deleted_at") || error.message.includes("deleted_source"))
  );
}

const MAX_DRAFTS_PER_TYPE = 10;
const MIN_SHARED_SOURCE_POSTS = 2;

function clampTypeDraftCount(value: number) {
  return Math.min(Math.max(Math.trunc(value), 0), MAX_DRAFTS_PER_TYPE);
}

function getSharedSourceCountFromDraftTypeCounts(input: {
  informational: number;
  engagement: number;
  product: number;
}) {
  const maxRequested = Math.max(
    input.informational,
    input.engagement,
    input.product,
  );

  return Math.max(MIN_SHARED_SOURCE_POSTS, Math.floor(maxRequested / 2));
}

function buildDraftTypeCounts(total: number) {
  const normalized = Math.min(Math.max(total, 3), MAX_DRAFTS_PER_TYPE * 3);
  const base = Math.floor(normalized / 3);
  const remainder = normalized % 3;

  return {
    informational: clampTypeDraftCount(base + (remainder > 0 ? 1 : 0)),
    engagement: clampTypeDraftCount(base + (remainder > 1 ? 1 : 0)),
    product: clampTypeDraftCount(base),
  } as const;
}

function buildWorkspaceCustomizationFromForm(formData: FormData) {
  return {
    targetAudience: getFormValue(formData, "targetAudience"),
    productLink: getFormValue(formData, "productLink"),
    commonInstruction: getFormValue(formData, "commonInstruction"),
    informationalFocus: getFormValue(formData, "informationalFocus"),
    engagementFocus: getFormValue(formData, "engagementFocus"),
    productFocus: getFormValue(formData, "productFocus"),
  };
}

function getReplyTextFromForm(formData: FormData) {
  return getFormValue(formData, "replyText");
}

function getReplyTextsFromForm(formData: FormData) {
  const jsonValue = getFormValue(formData, "replyTextsJson");

  if (jsonValue) {
    try {
      const parsed = JSON.parse(jsonValue) as unknown;
      if (Array.isArray(parsed)) {
        return parsed
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter(Boolean)
          .slice(0, 3);
      }
    } catch {
      // ignore malformed JSON and fall back
    }
  }

  const singleReplyText = getReplyTextFromForm(formData);
  return singleReplyText ? [singleReplyText] : [];
}

function getImageUrlsFromForm(formData: FormData) {
  const jsonValue = getFormValue(formData, "imageUrlsJson");

  if (!jsonValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(jsonValue) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter((value) => /^https?:\/\//i.test(value))
      .slice(0, 3);
  } catch {
    return [];
  }
}

function parseConnectedAccountIds(formData: FormData) {
  const jsonValue = getFormValue(formData, "connectedAccountIdsJson");
  const singleValue = getFormValue(formData, "connectedAccountId");

  if (jsonValue) {
    try {
      const parsed = JSON.parse(jsonValue) as unknown;
      if (Array.isArray(parsed)) {
        return [...new Set(parsed.filter((value): value is string => typeof value === "string" && value.trim().length > 0))];
      }
    } catch {
      // ignore malformed JSON and fall back to single value
    }
  }

  return singleValue ? [singleValue] : [];
}

async function getSchedulingAccountsForIds(userId: string, connectedAccountIds: string[]) {
  const accounts = [];

  for (const connectedAccountId of connectedAccountIds) {
    const account = await getConnectedAccountForScheduling({
      userId,
      connectedAccountId,
    });

    if (!account || !["x", "threads"].includes(account.platform)) {
      redirect("/dashboard?error=unsupported_platform");
    }

    accounts.push(account);
  }

  return accounts;
}

export async function generateHooksAction(formData: FormData) {
  const categoryValue = getFormValue(formData, "category");
  const keyword = getFormValue(formData, "keyword");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await ensureProfile(user);

  if (!process.env.GLM_API_KEY) {
    redirect("/dashboard?error=missing_glm_key");
  }

  if (!categoryValue || !keyword) {
    redirect("/dashboard?error=missing_hook_fields");
  }

  if (!isViralCategory(categoryValue)) {
    redirect("/dashboard?error=invalid_category");
  }

  const sourcePosts = await searchViralPosts({
    category: categoryValue,
    keyword,
    limit: 12,
  });

  if (sourcePosts.length === 0) {
    redirect(
      `/dashboard?error=no_viral_posts&category=${encodeURIComponent(categoryValue)}&keyword=${encodeURIComponent(keyword)}`,
    );
  }

  const generation = await generateViralHooks({
    category: categoryValue,
    keyword,
    platformTargets: ["x", "threads"],
    sourcePosts,
    hookCount: 5,
  });

  const outputs = generation.hooks.filter(Boolean);

  if (outputs.length === 0) {
    redirect("/dashboard?error=hook_generation_failed");
  }

  for (const outputText of outputs) {
    await createGeneratedHook({
      userId: user.id,
      category: categoryValue,
      keyword,
      platformTargets: ["x", "threads"],
      sourcePostIds: sourcePosts.map((post) => post.id),
      outputText,
      promptSnapshot: {
        category: categoryValue,
        keyword,
        source_posts: sourcePosts.map((post) => ({
          id: post.id,
          platform: post.platform,
          source_url: post.source_url,
        })),
        raw_response: generation.raw,
      },
      generationModel: "glm-4.7",
    });
  }

  redirect(
    `/dashboard?hooks=1&category=${encodeURIComponent(categoryValue)}&keyword=${encodeURIComponent(keyword)}`,
  );
}

export async function selectWorkspaceAction(formData: FormData) {
  const workspaceId = getFormValue(formData, "workspaceId");
  const redirectTo = getFormValue(formData, "redirectTo") || "/dashboard";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!workspaceId) {
    redirect(redirectTo);
  }

  await setActiveWorkspace({
    userId: user.id,
    workspaceId,
  });
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/workspaces");
  revalidatePath("/dashboard/posts");
  redirect(redirectTo);
}

export async function createWorkspaceAction(formData: FormData) {
  const workspaceName = getFormValue(formData, "workspaceName") || "workspace";
  const redirectTo = getFormValue(formData, "redirectTo") || "/dashboard/workspaces";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  try {
    const createdWorkspace = await createWorkspaceRecord({
      userId: user.id,
      name: workspaceName,
      keywords: [
        getFormValue(formData, "keyword1"),
        getFormValue(formData, "keyword2"),
        getFormValue(formData, "keyword3"),
      ],
      customization: buildWorkspaceCustomizationFromForm(formData),
      isActive: true,
    });
    revalidatePath("/dashboard", "layout");
    revalidatePath("/dashboard/workspaces");
    revalidatePath("/dashboard/posts");
    redirect(
      buildRedirectPath(redirectTo, {
        workspace_created: 1,
        workspace: createdWorkspace.id,
      }),
    );
  } catch (error) {
    unstable_rethrow(error);
    console.error("[createWorkspaceAction] failed", {
      userId: user.id,
      message: error instanceof Error ? error.message : String(error),
    });
    redirect(buildRedirectPath(redirectTo, { error: "workspace_create_failed" }));
  }
}

export async function saveWorkspaceSettingsAction(formData: FormData) {
  const workspaceId = getFormValue(formData, "workspaceId");
  const redirectTo = getFormValue(formData, "redirectTo") || "/dashboard/workspaces";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!workspaceId) {
    redirect(`${redirectTo}?error=missing_workspace`);
  }

  await updateWorkspaceRecord({
    userId: user.id,
    workspaceId,
    name: getFormValue(formData, "workspaceName") || "workspace",
    keywords: [
      getFormValue(formData, "keyword1"),
      getFormValue(formData, "keyword2"),
      getFormValue(formData, "keyword3"),
    ],
    customization: buildWorkspaceCustomizationFromForm(formData),
  });
  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/workspaces");
  revalidatePath("/dashboard/posts");
  redirect(
    buildRedirectPath(redirectTo, {
      workspace_saved: 1,
      workspace: workspaceId,
    }),
  );
}

export async function saveAccountKeywordsAction(formData: FormData) {
  const connectedAccountId = getFormValue(formData, "connectedAccountId");
  const redirectTo = getFormValue(formData, "redirectTo") || "/dashboard";
  const keywords = [
    getFormValue(formData, "keyword1"),
    getFormValue(formData, "keyword2"),
    getFormValue(formData, "keyword3"),
  ];

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await ensureProfile(user);

  if (!connectedAccountId) {
    redirect(`${redirectTo}?error=missing_connected_account`);
  }

  await replaceAccountKeywords({
    userId: user.id,
    connectedAccountId,
    keywords,
  });

  redirect(`${redirectTo}?keywords_saved=1`);
}

export async function disconnectConnectedAccountAction(formData: FormData) {
  const connectedAccountId = getFormValue(formData, "connectedAccountId");
  const redirectTo = getFormValue(formData, "redirectTo") || "/dashboard/connections";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!connectedAccountId) {
    redirect(buildRedirectPath(redirectTo, { error: "missing_connected_account" }));
  }

  await disconnectConnectedAccount({
    userId: user.id,
    connectedAccountId,
  });

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/connections");
  revalidatePath("/dashboard");
  redirect(buildRedirectPath(redirectTo, { disconnected: 1 }));
}

export async function syncPostedThreadsStatusAction(formData: FormData) {
  const redirectTo = getFormValue(formData, "redirectTo") || "/dashboard/posted";
  const scheduledPostIds = (() => {
    const jsonValue = getFormValue(formData, "scheduledPostIdsJson");
    if (!jsonValue) return [] as string[];

    try {
      const parsed = JSON.parse(jsonValue) as unknown;
      if (!Array.isArray(parsed)) return [] as string[];
      return parsed.filter(
        (value): value is string => typeof value === "string" && value.trim().length > 0,
      );
    } catch {
      return [] as string[];
    }
  })();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let externallyDeletedCount = 0;

  for (const scheduledPostId of scheduledPostIds) {
    try {
      const target = await getThreadsDeleteTarget({
        userId: user.id,
        scheduledPostId,
      });

      if (
        target.scheduledPost.platform !== "threads" ||
        target.scheduledPost.deleted_at ||
        !target.publishRun?.external_post_id
      ) {
        continue;
      }

      const accessToken = decryptSecret(target.token.access_token_ciphertext);
      const media = await getThreadsMediaObject({
        accessToken,
        mediaId: target.publishRun.external_post_id,
      });

      if (!media) {
        await markScheduledPostDeleted({
          scheduledPostId,
          source: "external",
        });
        externallyDeletedCount += 1;
      }
    } catch (error) {
      console.error("[syncPostedThreadsStatusAction] failed", {
        scheduledPostId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  revalidatePath("/dashboard/posted");
  revalidatePath("/dashboard/posts");
  redirect(
    buildRedirectPath(redirectTo, {
      sync_checked: scheduledPostIds.length,
      sync_deleted: externallyDeletedCount,
    }),
  );
}

export async function deletePostedThreadsPostAction(formData: FormData) {
  const scheduledPostId = getFormValue(formData, "scheduledPostId");
  const redirectTo = getFormValue(formData, "redirectTo") || "/dashboard/posted";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!scheduledPostId) {
    redirect(buildRedirectPath(redirectTo, { error: "missing_post_id" }));
  }

  try {
    const target = await getThreadsDeleteTarget({
      userId: user.id,
      scheduledPostId,
    });

    if (target.scheduledPost.platform !== "threads") {
      redirect(buildRedirectPath(redirectTo, { error: "threads_only_delete" }));
    }

    if (target.scheduledPost.deleted_at) {
      redirect(buildRedirectPath(redirectTo, { already_deleted: 1 }));
    }

    if (!target.publishRun?.external_post_id) {
      await markScheduledPostDeleted({
        scheduledPostId,
        source: "external",
      });
      revalidatePath("/dashboard/posted");
      revalidatePath("/dashboard/posts");
      redirect(buildRedirectPath(redirectTo, { externally_deleted: 1 }));
    }

    const accessToken = decryptSecret(target.token.access_token_ciphertext);
    const media = await getThreadsMediaObject({
      accessToken,
      mediaId: target.publishRun.external_post_id,
    });

    if (!media) {
      await markScheduledPostDeleted({
        scheduledPostId,
        source: "external",
      });
      revalidatePath("/dashboard/posted");
      revalidatePath("/dashboard/posts");
      redirect(buildRedirectPath(redirectTo, { externally_deleted: 1 }));
    }

    if (
      Array.isArray(target.token.scopes) &&
      target.token.scopes.length > 0 &&
      !hasThreadsDeleteScope(target.token.scopes)
    ) {
      redirect(buildRedirectPath(redirectTo, { error: "threads_delete_scope_required" }));
    }

    const deleteResult = await deleteThreadsMediaObject({
      accessToken,
      mediaId: target.publishRun.external_post_id,
    });

    await markScheduledPostDeleted({
      scheduledPostId,
      source: deleteResult.alreadyDeleted ? "external" : "app",
    });

    revalidatePath("/dashboard/posted");
    revalidatePath("/dashboard/posts");
    redirect(
      buildRedirectPath(redirectTo, {
        deleted: deleteResult.deleted ? 1 : 0,
        externally_deleted: deleteResult.alreadyDeleted ? 1 : 0,
      }),
    );
  } catch (error) {
    unstable_rethrow(error);

    if (isThreadsPermissionError(error)) {
      redirect(
        buildRedirectPath(redirectTo, { error: "threads_delete_scope_required" }),
      );
    }

    console.error("[deletePostedThreadsPostAction] failed", {
      scheduledPostId,
      message: error instanceof Error ? error.message : String(error),
    });
    redirect(
      buildRedirectPath(redirectTo, {
        error: isMissingDeletedStateError(error)
          ? "apply_delete_tracking_migration"
          : "delete_failed",
      }),
    );
  }
}

export async function generateAccountDraftsAction(formData: FormData) {
  const connectedAccountId = getFormValue(formData, "connectedAccountId");
  const workspaceId = getFormValue(formData, "workspaceId");
  const outputLanguage = resolveLocale(getFormValue(formData, "locale"));
  const generationRequestId = getFormValue(formData, "generationRequestId");
  const draftCountValue = getFormValue(formData, "draftCount");
  const informationalCountValue = getFormValue(formData, "informationalCount");
  const engagementCountValue = getFormValue(formData, "engagementCount");
  const productCountValue = getFormValue(formData, "productCount");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await ensureProfile(user);

  if (generationRequestId) {
    await setDraftGenerationStage({
      userId: user.id,
      requestId: generationRequestId,
      stage: "data_preparing",
    });
  }

  if (!process.env.GLM_API_KEY) {
    if (generationRequestId) {
      await setDraftGenerationStage({
        userId: user.id,
        requestId: generationRequestId,
        stage: "error",
      });
    }
    redirect("/dashboard?error=missing_glm_key");
  }

  const workspaceState = await getWorkspaceState({
    userId: user.id,
    fallbackKeywords: deriveWorkspaceKeywordsFromAccounts(
      (await listConnectedAccountsWithKeywords(user.id)).filter(
        (candidate) => candidate.platform === "threads",
      ),
    ),
  });
  const workspace = getActiveWorkspace(workspaceState, workspaceId);

  if (!workspace) {
    if (generationRequestId) {
      await setDraftGenerationStage({
        userId: user.id,
        requestId: generationRequestId,
        stage: "error",
      });
    }
    redirect("/onboarding");
  }

  const keywords = workspace.keywords.slice(0, 3);

  if (keywords.length === 0) {
    if (generationRequestId) {
      await setDraftGenerationStage({
        userId: user.id,
        requestId: generationRequestId,
        stage: "error",
      });
    }
    redirect("/dashboard?error=missing_account_keywords");
  }

  const explicitCounts = {
    informational: clampTypeDraftCount(
      Number.parseInt(informationalCountValue || "0", 10) || 0,
    ),
    engagement: clampTypeDraftCount(
      Number.parseInt(engagementCountValue || "0", 10) || 0,
    ),
    product: clampTypeDraftCount(Number.parseInt(productCountValue || "0", 10) || 0),
  };
  const totalExplicitCount =
    explicitCounts.informational +
    explicitCounts.engagement +
    explicitCounts.product;
  const fallbackDraftCount = Math.min(
    Math.max(Number.parseInt(draftCountValue || "3", 10) || 3, 1),
    MAX_DRAFTS_PER_TYPE * 3,
  );
  const draftTypeCounts =
    totalExplicitCount > 0
      ? explicitCounts
      : buildDraftTypeCounts(fallbackDraftCount);
  const sharedSourceCount = getSharedSourceCountFromDraftTypeCounts(draftTypeCounts);

  const topicCluster = inferTopicClusterFromKeywords(keywords);
  const generationTraceId = `gen_${workspace.id.slice(0, 8)}_${Date.now()}`;
  const workspaceUsedSourcePostIds = await listWorkspaceUsedSourcePostIds(
    workspace.id,
  );
  const minimumSourceCount = sharedSourceCount;
  const libraryFetchCount = Math.max(sharedSourceCount * 8, 24);
  let ingestionTriggered = false;
  let sourcePosts = await searchThreadsViralPostsByKeywords({
    keywords,
    topicCluster,
    limit: libraryFetchCount,
    excludePostIds: workspaceUsedSourcePostIds,
  });

  if (sourcePosts.length < minimumSourceCount) {
    try {
      ingestionTriggered = true;
      await triggerSearchIngestion({
        keywords,
        topic_cluster: topicCluster,
        locale: outputLanguage,
        target_post_count: minimumSourceCount,
        scraper_account: getDefaultScraperAccountForCluster(topicCluster),
      });

      sourcePosts = await searchThreadsViralPostsByKeywords({
        keywords,
        topicCluster,
        limit: libraryFetchCount,
        excludePostIds: workspaceUsedSourcePostIds,
      });
    } catch (error) {
      console.error("[generateAccountDraftsAction] search ingestion failed", {
        topicCluster,
        keywords,
        scraperAccount: getDefaultScraperAccountForCluster(topicCluster),
        message: error instanceof Error ? error.message : String(error),
      });
      if (sourcePosts.length === 0) {
        if (generationRequestId) {
          await setDraftGenerationStage({
            userId: user.id,
            requestId: generationRequestId,
            stage: "error",
          });
        }
        redirect("/dashboard?error=ingestion_unavailable");
      }
    }
  }

  if (sourcePosts.length === 0) {
    if (generationRequestId) {
      await setDraftGenerationStage({
        userId: user.id,
        requestId: generationRequestId,
        stage: "error",
      });
    }
    redirect("/dashboard?error=no_viral_posts");
  }

  const selectedSourcePosts = sourcePosts.slice(0, minimumSourceCount);
  const selectedSourcePostIds = selectedSourcePosts.map((post) => post.id);
  const selectedSourcePostSet = new Set(selectedSourcePostIds);
  const overlapWithUsedCount = workspaceUsedSourcePostIds.filter((id) =>
    selectedSourcePostSet.has(id),
  ).length;

  console.info("[generateAccountDraftsAction] source selection", {
    trace_id: generationTraceId,
    workspace_id: workspace.id,
    connected_account_id: connectedAccountId || null,
    topic_cluster: topicCluster,
    keywords,
    draft_type_counts: draftTypeCounts,
    shared_source_count: sharedSourceCount,
    min_required_source_count: minimumSourceCount,
    library_fetch_count: libraryFetchCount,
    ingestion_triggered: ingestionTriggered,
    used_source_post_count: workspaceUsedSourcePostIds.length,
    fetched_source_post_count: sourcePosts.length,
    selected_source_post_count: selectedSourcePostIds.length,
    overlap_with_used_count: overlapWithUsedCount,
    selected_source_post_ids: selectedSourcePostIds,
  });

  const promptCategory: "fitness_diet" | "vibe_coding" =
    topicCluster === "health_fitness" ? "fitness_diet" : "vibe_coding";

  const promptSourcePosts = selectedSourcePosts.map((post) => ({
    ...post,
    category: promptCategory,
  }));

  const selectedAccount = connectedAccountId
    ? await getConnectedAccountWithKeywords({
        userId: user.id,
        connectedAccountId,
      }).catch(() => null)
    : null;

  let generation;

  try {
    if (generationRequestId) {
      await setDraftGenerationStage({
        userId: user.id,
        requestId: generationRequestId,
        stage: "draft_generating",
      });
    }

    generation = await generateTypedThreadsDrafts({
      keywords,
      sourcePosts: promptSourcePosts,
      outputLanguage,
      audience:
        workspace.customization.targetAudience ||
        (selectedAccount?.username
          ? `@${selectedAccount.username} followers`
          : "Threads followers"),
      accountLabel: workspace.name || selectedAccount?.display_name || "Workspace",
      targetAudience: workspace.customization.targetAudience || undefined,
      productLink: workspace.customization.productLink || undefined,
      commonInstruction: workspace.customization.commonInstruction || undefined,
      informationalFocus: workspace.customization.informationalFocus || undefined,
      engagementFocus: workspace.customization.engagementFocus || undefined,
      productFocus: workspace.customization.productFocus || undefined,
      counts: draftTypeCounts,
    });
  } catch (error) {
    console.error("[generateAccountDraftsAction] draft generation failed", error);
    if (generationRequestId) {
      await setDraftGenerationStage({
        userId: user.id,
        requestId: generationRequestId,
        stage: "error",
      });
    }
    redirect(
      `/dashboard?error=draft_generation_failed&account=${encodeURIComponent(connectedAccountId)}`,
    );
  }

  const draftEntries = [
    ...generation.drafts.informational.map((outputText) => ({
      outputText,
      draftType: "informational" as const,
      outputStyle: "threads_beta_informational",
    })),
    ...generation.drafts.engagement.map((outputText) => ({
      outputText,
      draftType: "engagement" as const,
      outputStyle: "threads_beta_engagement",
    })),
    ...generation.drafts.product.map((outputText) => ({
      outputText,
      draftType: "product" as const,
      outputStyle: "threads_beta_product",
    })),
  ].filter((entry) => Boolean(entry.outputText));

  if (draftEntries.length === 0) {
    if (generationRequestId) {
      await setDraftGenerationStage({
        userId: user.id,
        requestId: generationRequestId,
        stage: "error",
      });
    }
    redirect("/dashboard?error=draft_generation_failed");
  }

  for (const draftEntry of draftEntries) {
    const threadReplyTexts =
      draftEntry.draftType === "product"
        ? buildProductReplyTexts({
            productLink: workspace.customization.productLink,
            accountLabel: workspace.name,
            targetAudience: workspace.customization.targetAudience,
            outputLanguage,
          })
        : [];

    await createGeneratedHook({
      userId: user.id,
      category: promptCategory,
      keyword: keywords.join(", "),
      platformTargets: ["threads"],
      sourcePostIds: selectedSourcePostIds,
      outputText: draftEntry.outputText,
      outputReplyText: threadReplyTexts[0] ?? null,
      outputReplyTexts: threadReplyTexts,
      outputStyle: draftEntry.outputStyle,
      promptSnapshot: {
        connected_account_id: connectedAccountId || null,
        workspace_id: workspace.id,
        workspace_name: workspace.name,
        output_language: outputLanguage,
        topic_cluster: topicCluster,
        keywords,
        draft_type: draftEntry.draftType,
        customizations: {
          targetAudience: workspace.customization.targetAudience,
          productLink: workspace.customization.productLink,
          commonInstruction: workspace.customization.commonInstruction,
          informationalFocus: workspace.customization.informationalFocus,
          engagementFocus: workspace.customization.engagementFocus,
          productFocus: workspace.customization.productFocus,
        },
        thread_reply_text: threadReplyTexts[0] ?? null,
        thread_reply_texts: threadReplyTexts.length > 0 ? threadReplyTexts : null,
        source_posts: selectedSourcePosts.map((post) => ({
          id: post.id,
          platform: post.platform,
          source_url: post.source_url,
        })),
        source_post_count: selectedSourcePosts.length,
        raw_response: generation.raw,
      },
      generationModel: "glm-4.7",
    });
  }

  try {
    await markWorkspaceSourcePostsUsed({
      workspaceId: workspace.id,
      sourcePostIds: selectedSourcePostIds,
    });
    console.info("[generateAccountDraftsAction] source usage marked", {
      trace_id: generationTraceId,
      workspace_id: workspace.id,
      marked_source_post_count: selectedSourcePostIds.length,
      marked_source_post_ids: selectedSourcePostIds,
    });
  } catch (error) {
    console.error("[generateAccountDraftsAction] source usage mark failed", {
      trace_id: generationTraceId,
      workspaceId: workspace.id,
      sourcePostCount: selectedSourcePosts.length,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  if (generationRequestId) {
    await setDraftGenerationStage({
      userId: user.id,
      requestId: generationRequestId,
      stage: "done",
    });
  }

  redirect(
    `/dashboard?drafts=1&draft_count=${draftEntries.length}&workspace=${encodeURIComponent(workspace.id)}`,
  );
}

export async function schedulePostAction(formData: FormData) {
  const connectedAccountId = getFormValue(formData, "connectedAccountId");
  const workspaceId = getFormValue(formData, "workspaceId");
  const postText = getFormValue(formData, "postText");
  const scheduledForValue = getFormValue(formData, "scheduledFor");
  const timezone =
    getFormValue(formData, "timezone") ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await ensureProfile(user);

  if (!process.env.TRIGGER_SECRET_KEY) {
    redirect("/dashboard?error=missing_trigger_secret");
  }

  if (!connectedAccountId || !postText || !scheduledForValue) {
    redirect("/dashboard?error=missing_schedule_fields");
  }

  const scheduledDate = new Date(scheduledForValue);

  if (Number.isNaN(scheduledDate.getTime())) {
    redirect("/dashboard?error=invalid_schedule_time");
  }

  if (scheduledDate.getTime() <= Date.now()) {
    redirect("/dashboard?error=schedule_must_be_future");
  }

  const account = await getConnectedAccountForScheduling({
    userId: user.id,
    connectedAccountId,
  });

  if (!account || !["x", "threads"].includes(account.platform)) {
    redirect("/dashboard?error=unsupported_platform");
  }

  const idempotencyKey = createScheduledPostIdempotencyKey();
  const scheduledPost = await createScheduledPost({
    userId: user.id,
    connectedAccountId,
    workspaceId: workspaceId || null,
    platform: account.platform,
    postText,
    scheduledFor: scheduledDate.toISOString(),
    timezone,
    idempotencyKey,
  });

  const handle = await tasks.trigger<typeof scheduledPublishTask>(
    "scheduled-publish",
    {
      scheduledPostId: scheduledPost.id,
      platform: account.platform,
      userId: user.id,
      accountId: connectedAccountId,
    },
    {
      delay: scheduledDate,
      idempotencyKey,
    },
  );

  await attachTriggerRunId({
    scheduledPostId: scheduledPost.id,
    triggerRunId: handle.id,
  });

  redirect("/dashboard?scheduled=1");
}

export async function scheduleBulkPostsAction(formData: FormData) {
  const connectedAccountId = getFormValue(formData, "connectedAccountId");
  const workspaceId = getFormValue(formData, "workspaceId");
  const postsJson = getFormValue(formData, "posts");
  const timezone =
    getFormValue(formData, "timezone") ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await ensureProfile(user);

  if (!process.env.TRIGGER_SECRET_KEY) {
    redirect("/dashboard?error=missing_trigger_secret");
  }

  if (!connectedAccountId || !postsJson) {
    redirect("/dashboard?error=missing_schedule_fields");
  }
  
  let posts: { text: string; time: string }[] = [];
  try {
    posts = JSON.parse(postsJson);
  } catch {
    redirect("/dashboard?error=invalid_posts_payload");
  }

  if (posts.length === 0) {
    redirect("/dashboard?error=no_posts_selected");
  }

  const account = await getConnectedAccountForScheduling({
    userId: user.id,
    connectedAccountId,
  });

  if (!account || !["x", "threads"].includes(account.platform)) {
    redirect("/dashboard?error=unsupported_platform");
  }

  let successCount = 0;

  for (const post of posts) {
    const scheduledDate = new Date(post.time);
    if (Number.isNaN(scheduledDate.getTime()) || scheduledDate.getTime() <= Date.now()) {
      continue;
    }

    const idempotencyKey = createScheduledPostIdempotencyKey();
    const scheduledPost = await createScheduledPost({
      userId: user.id,
      connectedAccountId,
      workspaceId: workspaceId || null,
      platform: account.platform,
      postText: post.text,
      scheduledFor: scheduledDate.toISOString(),
      timezone,
      idempotencyKey,
    });

    const handle = await tasks.trigger<typeof scheduledPublishTask>(
      "scheduled-publish",
      {
        scheduledPostId: scheduledPost.id,
        platform: account.platform,
        userId: user.id,
        accountId: connectedAccountId,
      },
      {
        delay: scheduledDate,
        idempotencyKey,
      },
    );

    await attachTriggerRunId({
      scheduledPostId: scheduledPost.id,
      triggerRunId: handle.id,
    });

    successCount++;
  }

  if (successCount === 0) {
    redirect("/dashboard?error=schedule_must_be_future");
  }

  redirect("/dashboard?scheduled_bulk=" + successCount);
}

export async function publishGeneratedDraftNowAction(formData: FormData) {
  const connectedAccountIds = parseConnectedAccountIds(formData);
  const generatedHookId = getFormValue(formData, "generatedHookId");
  const workspaceId = getFormValue(formData, "workspaceId");
  const postText = getFormValue(formData, "postText");
  const imageUrls = getImageUrlsFromForm(formData);
  const replyTexts = getReplyTextsFromForm(formData);
  const timezone =
    getFormValue(formData, "timezone") ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await ensureProfile(user);

  if (connectedAccountIds.length === 0 || !postText) {
    redirect("/dashboard?error=missing_schedule_fields");
  }

  const accounts = await getSchedulingAccountsForIds(user.id, connectedAccountIds);
  let publishedCount = 0;
  let failedCount = 0;

  for (const account of accounts) {
    const scheduledPost = await createScheduledPost({
      userId: user.id,
      connectedAccountId: account.id,
      workspaceId: workspaceId || null,
      generatedHookId: generatedHookId || null,
      platform: account.platform,
      postText,
      imageUrls: account.platform === "threads" ? imageUrls : null,
      replyText: account.platform === "threads" ? replyTexts[0] ?? null : null,
      replyTexts: account.platform === "threads" ? replyTexts : null,
      scheduledFor: new Date().toISOString(),
      timezone,
      idempotencyKey: createScheduledPostIdempotencyKey(),
    });

    try {
      await runImmediatePublish({
        scheduledPostId: scheduledPost.id,
        platform: account.platform,
      });
      publishedCount += 1;
    } catch {
      failedCount += 1;
    }
  }

  if (publishedCount === 0) {
    redirect(`/dashboard?error=publish_failed&failed_count=${failedCount}`);
  }

  redirect(
    `/dashboard?published=1&published_count=${publishedCount}&failed_count=${failedCount}`,
  );
}

export async function scheduleGeneratedDraftAction(formData: FormData) {
  const connectedAccountIds = parseConnectedAccountIds(formData);
  const generatedHookId = getFormValue(formData, "generatedHookId");
  const workspaceId = getFormValue(formData, "workspaceId");
  const postText = getFormValue(formData, "postText");
  const imageUrls = getImageUrlsFromForm(formData);
  const replyTexts = getReplyTextsFromForm(formData);
  const scheduleDate = getFormValue(formData, "scheduleDate");
  const scheduleTime = getFormValue(formData, "scheduleTime");
  const timezone =
    getFormValue(formData, "timezone") ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await ensureProfile(user);

  if (!process.env.TRIGGER_SECRET_KEY) {
    redirect("/dashboard?error=missing_trigger_secret");
  }

  if (connectedAccountIds.length === 0 || !postText || !scheduleDate || !scheduleTime) {
    redirect("/dashboard?error=missing_schedule_fields");
  }

  const accounts = await getSchedulingAccountsForIds(user.id, connectedAccountIds);

  const scheduledDate = new Date(`${scheduleDate}T${scheduleTime}`);

  if (Number.isNaN(scheduledDate.getTime()) || scheduledDate.getTime() <= Date.now()) {
    redirect("/dashboard?error=schedule_must_be_future");
  }

  let scheduledCount = 0;

  for (const account of accounts) {
    const idempotencyKey = createScheduledPostIdempotencyKey();
    const scheduledPost = await createScheduledPost({
      userId: user.id,
      connectedAccountId: account.id,
      workspaceId: workspaceId || null,
      generatedHookId: generatedHookId || null,
      platform: account.platform,
      postText,
      imageUrls: account.platform === "threads" ? imageUrls : null,
      replyText: account.platform === "threads" ? replyTexts[0] ?? null : null,
      replyTexts: account.platform === "threads" ? replyTexts : null,
      scheduledFor: scheduledDate.toISOString(),
      timezone,
      idempotencyKey,
    });

    const handle = await tasks.trigger<typeof scheduledPublishTask>(
      "scheduled-publish",
      {
        scheduledPostId: scheduledPost.id,
        platform: account.platform,
        userId: user.id,
        accountId: account.id,
      },
      {
        delay: scheduledDate,
        idempotencyKey,
      },
    );

    await attachTriggerRunId({
      scheduledPostId: scheduledPost.id,
      triggerRunId: handle.id,
    });

    scheduledCount += 1;
  }

  redirect(`/dashboard?scheduled=1&scheduled_count=${scheduledCount}`);
}

export async function saveDraftPostsAction(formData: FormData) {
  const connectedAccountIds = parseConnectedAccountIds(formData);
  const generatedHookId = getFormValue(formData, "generatedHookId");
  const workspaceId = getFormValue(formData, "workspaceId");
  const postText = getFormValue(formData, "postText");
  const imageUrls = getImageUrlsFromForm(formData);
  const replyTexts = getReplyTextsFromForm(formData);
  const timezone =
    getFormValue(formData, "timezone") ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await ensureProfile(user);

  if (connectedAccountIds.length === 0 || !postText) {
    redirect("/dashboard?error=missing_schedule_fields");
  }

  const accounts = await getSchedulingAccountsForIds(user.id, connectedAccountIds);
  let savedCount = 0;

  for (const account of accounts) {
    await createScheduledPost({
      userId: user.id,
      connectedAccountId: account.id,
      workspaceId: workspaceId || null,
      generatedHookId: generatedHookId || null,
      platform: account.platform,
      postText,
      imageUrls: account.platform === "threads" ? imageUrls : null,
      replyText: account.platform === "threads" ? replyTexts[0] ?? null : null,
      replyTexts: account.platform === "threads" ? replyTexts : null,
      scheduledFor: new Date().toISOString(),
      timezone,
      status: "draft",
      idempotencyKey: createScheduledPostIdempotencyKey(),
    });

    savedCount += 1;
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/drafts");
  revalidatePath("/dashboard/posts");
  redirect(`/dashboard?draft_saved=1&draft_saved_count=${savedCount}`);
}

export async function publishDraftPostNowAction(formData: FormData) {
  const scheduledPostId = getFormValue(formData, "scheduledPostId");
  const redirectTo = getFormValue(formData, "redirectTo") || "/dashboard/drafts";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!scheduledPostId) {
    redirect(buildRedirectPath(redirectTo, { error: "missing_post_id" }));
  }

  const { data: draftPost, error } = await supabase
    .from("scheduled_posts")
    .select("id, platform, status")
    .eq("id", scheduledPostId)
    .eq("user_id", user.id)
    .single();

  if (error || !draftPost || draftPost.status !== "draft") {
    redirect(buildRedirectPath(redirectTo, { error: "publish_failed" }));
  }

  try {
    await runImmediatePublish({
      scheduledPostId: draftPost.id,
      platform: draftPost.platform,
    });
  } catch {
    redirect(buildRedirectPath(redirectTo, { error: "publish_failed" }));
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/drafts");
  revalidatePath("/dashboard/posts");
  revalidatePath("/dashboard/posted");
  redirect(buildRedirectPath(redirectTo, { published: 1, published_count: 1 }));
}

export async function scheduleDraftPostAction(formData: FormData) {
  const scheduledPostId = getFormValue(formData, "scheduledPostId");
  const redirectTo = getFormValue(formData, "redirectTo") || "/dashboard/drafts";
  const scheduleDate = getFormValue(formData, "scheduleDate");
  const scheduleTime = getFormValue(formData, "scheduleTime");
  const timezone =
    getFormValue(formData, "timezone") ||
    Intl.DateTimeFormat().resolvedOptions().timeZone;

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!process.env.TRIGGER_SECRET_KEY) {
    redirect(buildRedirectPath(redirectTo, { error: "missing_trigger_secret" }));
  }

  if (!scheduledPostId || !scheduleDate || !scheduleTime) {
    redirect(buildRedirectPath(redirectTo, { error: "missing_schedule_fields" }));
  }

  const scheduledDate = new Date(`${scheduleDate}T${scheduleTime}`);

  if (Number.isNaN(scheduledDate.getTime()) || scheduledDate.getTime() <= Date.now()) {
    redirect(buildRedirectPath(redirectTo, { error: "schedule_must_be_future" }));
  }

  const { data: draftPost, error } = await supabase
    .from("scheduled_posts")
    .select("id, connected_account_id, platform, status")
    .eq("id", scheduledPostId)
    .eq("user_id", user.id)
    .single();

  if (error || !draftPost || draftPost.status !== "draft") {
    redirect(buildRedirectPath(redirectTo, { error: "schedule_failed" }));
  }

  const idempotencyKey = createScheduledPostIdempotencyKey();
  const { error: updateError } = await supabase
    .from("scheduled_posts")
    .update({
      scheduled_for: scheduledDate.toISOString(),
      timezone,
      status: "scheduled",
      trigger_run_id: null,
      updated_at: new Date().toISOString(),
      idempotency_key: idempotencyKey,
    })
    .eq("id", scheduledPostId)
    .eq("user_id", user.id);

  if (updateError) {
    redirect(buildRedirectPath(redirectTo, { error: "schedule_failed" }));
  }

  const handle = await tasks.trigger<typeof scheduledPublishTask>(
    "scheduled-publish",
    {
      scheduledPostId: draftPost.id,
      platform: draftPost.platform,
      userId: user.id,
      accountId: draftPost.connected_account_id,
    },
    {
      delay: scheduledDate,
      idempotencyKey,
    },
  );

  await attachTriggerRunId({
    scheduledPostId: draftPost.id,
    triggerRunId: handle.id,
  });

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/drafts");
  revalidatePath("/dashboard/posts");
  revalidatePath("/dashboard/scheduled");
  redirect(buildRedirectPath(redirectTo, { scheduled: 1, scheduled_count: 1 }));
}

export async function deleteDraftPostAction(formData: FormData) {
  const scheduledPostId = getFormValue(formData, "scheduledPostId");
  const redirectTo = getFormValue(formData, "redirectTo") || "/dashboard/drafts";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!scheduledPostId) {
    redirect(buildRedirectPath(redirectTo, { error: "missing_post_id" }));
  }

  const { error } = await supabase
    .from("scheduled_posts")
    .delete()
    .eq("id", scheduledPostId)
    .eq("user_id", user.id)
    .eq("status", "draft");

  if (error) {
    redirect(buildRedirectPath(redirectTo, { error: "delete_failed" }));
  }

  revalidatePath("/dashboard", "layout");
  revalidatePath("/dashboard/drafts");
  redirect(buildRedirectPath(redirectTo, { deleted: 1 }));
}

export async function cancelScheduledPostAction(formData: FormData) {
  const postId = getFormValue(formData, "postId");
  const redirectTo = getFormValue(formData, "redirectTo") || "/dashboard/scheduled";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  if (!postId) {
    redirect(`${redirectTo}?error=missing_post_id`);
  }

  const { error } = await supabase
    .from("scheduled_posts")
    .update({ 
      status: "cancelled", 
      updated_at: new Date().toISOString() 
    })
    .eq("id", postId)
    .eq("user_id", user.id);

  if (error) {
    console.error("[cancelScheduledPostAction] Error canceling post", error);
    redirect(`${redirectTo}?error=cancel_failed`);
  }

  redirect(`${redirectTo}?cancelled=1`);
}
