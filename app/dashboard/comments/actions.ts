"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureProfile, getConnectedAccountWithKeywords } from "@/lib/db/accounts";
import { listScheduledPosts } from "@/lib/db/publishing";
import { decryptSecret } from "@/lib/crypto";
import { getWorkspaceState, getActiveWorkspace } from "@/lib/dashboard/workspaces";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { replyToThreadsComment } from "@/lib/platforms/threads";

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

function isThreadsReplyPermissionError(error: unknown) {
  return (
    error instanceof Error &&
    /permission|not authorized|thapiexception|code\":10/i.test(error.message)
  );
}

export async function replyToThreadsCommentAction(formData: FormData) {
  const scheduledPostId = getFormValue(formData, "scheduledPostId");
  const commentId = getFormValue(formData, "commentId");
  const replyText = getFormValue(formData, "replyText");
  const redirectTo = getFormValue(formData, "redirectTo") || "/dashboard/comments";
  const workspaceId = getFormValue(formData, "workspaceId");
  const connectedAccountId = getFormValue(formData, "connectedAccountId");

  if (!scheduledPostId || !commentId || !replyText) {
    redirect(buildRedirectPath(redirectTo, { error: "missing_fields" }));
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await ensureProfile(user);

  const workspaceState = await getWorkspaceState({ userId: user.id });
  const activeWorkspace = getActiveWorkspace(workspaceState, workspaceId || null);

  if (!activeWorkspace || activeWorkspace.id !== workspaceId) {
    redirect(buildRedirectPath(redirectTo, { error: "invalid_workspace" }));
  }

  const workspacePosts = await listScheduledPosts(user.id, {
    workspaceId: activeWorkspace.id,
  });
  const post = workspacePosts.find((entry) => entry.id === scheduledPostId);

  if (
    !post ||
    post.workspace_id !== activeWorkspace.id ||
    post.platform !== "threads" ||
    !post.connected_account ||
    !post.latest_publish_run?.external_post_id
  ) {
    redirect(buildRedirectPath(redirectTo, { error: "invalid_post" }));
  }

  if (connectedAccountId && connectedAccountId !== post.connected_account_id) {
    redirect(buildRedirectPath(redirectTo, { error: "invalid_account" }));
  }

  const account = await getConnectedAccountWithKeywords({
    userId: user.id,
    connectedAccountId: post.connected_account_id,
  });

  if (!account || account.platform !== "threads") {
    redirect(buildRedirectPath(redirectTo, { error: "invalid_account" }));
  }

  const { data: tokenRow, error: tokenError } = await supabase
    .from("oauth_tokens")
    .select("access_token_ciphertext, platform, scopes")
    .eq("connected_account_id", account.id)
    .eq("platform", "threads")
    .single();

  if (tokenError || !tokenRow) {
    redirect(buildRedirectPath(redirectTo, { error: "missing_token" }));
  }

  if (
    Array.isArray((tokenRow as { scopes?: unknown }).scopes) &&
    !(tokenRow as { scopes: string[] }).scopes.includes("threads_manage_replies")
  ) {
    redirect(buildRedirectPath(redirectTo, { error: "missing_scope" }));
  }

  let accessToken: string;
  try {
    accessToken = decryptSecret(
      (tokenRow as { access_token_ciphertext?: string }).access_token_ciphertext ?? "",
    );
  } catch {
    redirect(buildRedirectPath(redirectTo, { error: "missing_token" }));
  }

  try {
    await replyToThreadsComment({
      accessToken,
      commentId,
      text: replyText,
      username: account.username,
    });
  } catch (error) {
    console.error("[replyToThreadsCommentAction] reply failed", {
      scheduledPostId,
      workspaceId,
      connectedAccountId: account.id,
      commentId,
      message: error instanceof Error ? error.message : String(error),
    });

    if (isThreadsReplyPermissionError(error)) {
      redirect(buildRedirectPath(redirectTo, { error: "missing_scope" }));
    }

    redirect(buildRedirectPath(redirectTo, { error: "reply_failed" }));
  }

  revalidatePath("/dashboard/comments");
  redirect(
    buildRedirectPath(redirectTo, {
      replied: 1,
      repliedCommentId: commentId,
      includeReplied: 1,
    }),
  );
}
