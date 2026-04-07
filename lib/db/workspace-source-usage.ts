import "server-only";

import { createSupabaseAdminClient } from "@/utils/supabase/admin";
import { createSupabaseServerClient } from "@/utils/supabase/server";

function isMissingWorkspaceSourcePostUsageTableError(
  error: { code?: string; message?: string } | null | undefined,
) {
  return (
    error?.code === "42P01" ||
    (typeof error?.message === "string" &&
      error.message.includes("workspace_source_post_usage") &&
      error.message.includes("does not exist"))
  );
}

function normalizeSourcePostIds(sourcePostIds: string[]) {
  return sourcePostIds
    .map((sourcePostId) => sourcePostId.trim())
    .filter(Boolean)
    .filter((sourcePostId, index, items) => items.indexOf(sourcePostId) === index);
}

export async function listWorkspaceUsedSourcePostIds(
  workspaceId: string,
): Promise<string[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("workspace_source_post_usage")
    .select("source_post_id")
    .eq("workspace_id", workspaceId)
    .order("last_used_at", { ascending: false });

  if (isMissingWorkspaceSourcePostUsageTableError(error)) {
    return [];
  }

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => row.source_post_id);
}

export async function markWorkspaceSourcePostsUsed(input: {
  workspaceId: string;
  sourcePostIds: string[];
}): Promise<void> {
  const sourcePostIds = normalizeSourcePostIds(input.sourcePostIds);

  if (sourcePostIds.length === 0) {
    return;
  }

  const supabase = await createSupabaseServerClient();
  const now = new Date().toISOString();
  const rows = sourcePostIds.map((sourcePostId) => ({
    workspace_id: input.workspaceId,
    source_post_id: sourcePostId,
    first_used_at: now,
    last_used_at: now,
  }));

  const { error: upsertError } = await supabase
    .from("workspace_source_post_usage")
    .upsert(rows, {
      onConflict: "workspace_id,source_post_id",
      ignoreDuplicates: true,
    });

  if (isMissingWorkspaceSourcePostUsageTableError(upsertError)) {
    return;
  }

  if (upsertError) {
    throw upsertError;
  }

  const { error: updateError } = await supabase
    .from("workspace_source_post_usage")
    .update({ last_used_at: now })
    .eq("workspace_id", input.workspaceId)
    .in("source_post_id", sourcePostIds);

  if (isMissingWorkspaceSourcePostUsageTableError(updateError)) {
    return;
  }

  if (updateError) {
    throw updateError;
  }
}

export async function listWorkspaceUsedSourcePostIdsAdmin(
  workspaceId: string,
): Promise<string[]> {
  const supabase = createSupabaseAdminClient();

  const { data, error } = await supabase
    .from("workspace_source_post_usage")
    .select("source_post_id")
    .eq("workspace_id", workspaceId)
    .order("last_used_at", { ascending: false });

  if (isMissingWorkspaceSourcePostUsageTableError(error)) {
    return [];
  }

  if (error) {
    throw error;
  }

  return (data ?? []).map((row) => row.source_post_id);
}

export async function markWorkspaceSourcePostsUsedAdmin(input: {
  workspaceId: string;
  sourcePostIds: string[];
}): Promise<void> {
  const sourcePostIds = normalizeSourcePostIds(input.sourcePostIds);

  if (sourcePostIds.length === 0) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  const now = new Date().toISOString();
  const rows = sourcePostIds.map((sourcePostId) => ({
    workspace_id: input.workspaceId,
    source_post_id: sourcePostId,
    first_used_at: now,
    last_used_at: now,
  }));

  const { error: upsertError } = await supabase
    .from("workspace_source_post_usage")
    .upsert(rows, {
      onConflict: "workspace_id,source_post_id",
      ignoreDuplicates: true,
    });

  if (isMissingWorkspaceSourcePostUsageTableError(upsertError)) {
    return;
  }

  if (upsertError) {
    throw upsertError;
  }

  const { error: updateError } = await supabase
    .from("workspace_source_post_usage")
    .update({ last_used_at: now })
    .eq("workspace_id", input.workspaceId)
    .in("source_post_id", sourcePostIds);

  if (isMissingWorkspaceSourcePostUsageTableError(updateError)) {
    return;
  }

  if (updateError) {
    throw updateError;
  }
}
