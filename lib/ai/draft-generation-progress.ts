import "server-only";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";

export type DraftGenerationStage =
  | "data_preparing"
  | "draft_generating"
  | "done"
  | "error";

export async function setDraftGenerationStage(input: {
  userId?: string | null;
  requestId: string;
  stage: DraftGenerationStage;
}) {
  if (!input.requestId) return;

  const admin = createSupabaseAdminClient();
  const nowIso = new Date().toISOString();

  const { error } = await admin
    .from("draft_generation_progress")
    .upsert(
      {
        request_id: input.requestId,
        user_id: input.userId ?? null,
        stage: input.stage,
        updated_at: nowIso,
      },
      {
        onConflict: "request_id",
        ignoreDuplicates: false,
      },
    );

  if (error) {
    console.error("[setDraftGenerationStage] failed", {
      requestId: input.requestId,
      stage: input.stage,
      message: error.message,
    });
  }
}

export async function getDraftGenerationStage(input: {
  requestId: string;
}): Promise<DraftGenerationStage | null> {
  if (!input.requestId) return null;

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("draft_generation_progress")
    .select("stage, updated_at")
    .eq("request_id", input.requestId)
    .maybeSingle();

  if (error) {
    console.error("[getDraftGenerationStage] failed", {
      requestId: input.requestId,
      message: error.message,
    });
    return null;
  }

  if (!data?.stage) return null;

  const stage = data.stage;
  if (
    stage === "data_preparing" ||
    stage === "draft_generating" ||
    stage === "done" ||
    stage === "error"
  ) {
    return stage;
  }

  return null;
}
