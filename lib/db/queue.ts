import "server-only";

import {
  QUEUE_GENERATED_HOOK_STYLE_BY_DRAFT_TYPE,
  type QueueAiDraftType,
  type QueueActiveThreadsAccount,
  type QueueDraftCandidate,
  type QueueGeneratedHookCandidate,
  type QueueScheduledPostInsertInput,
  type QueueScheduledPostReference,
  type QueueSourceMode,
  type QueueWeekday,
  type WorkspaceQueueDispatchRunRecord,
  type WorkspaceQueueSettingsRecord,
  type WorkspaceQueueSettingsWithSlotsRecord,
  type WorkspaceQueueTimeSlotRecord,
} from "@/lib/types/queue";
import { createSupabaseAdminClient } from "@/utils/supabase/admin";

type QueueSettingsRow = {
  id: string;
  workspace_id: string;
  source_mode: QueueSourceMode;
  ai_draft_type: QueueAiDraftType | null;
  timezone: string;
  randomize_posting_time: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  slots?: Array<{
    id: string;
    weekday: number;
    slot_time: string;
    source_mode: QueueSourceMode;
    ai_draft_type: QueueAiDraftType | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }>;
};

type QueueDispatchRunRow = {
  id: string;
  workspace_id: string;
  workspace_queue_settings_id: string;
  user_id: string;
  source_mode: QueueSourceMode;
  ai_draft_type: QueueAiDraftType | null;
  timezone: string;
  local_date: string;
  weekday: number;
  slot_time: string;
  status: "running" | "success" | "skipped" | "failed";
  summary: Record<string, unknown>;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
};

type QueueGeneratedHookRow = {
  id: string;
  output_text: string;
  output_reply_text: string | null;
  output_reply_texts: string[] | null;
  output_style: string;
  source_post_ids: string[];
  prompt_snapshot: Record<string, unknown> | null;
  created_at: string;
};

type QueueScheduledPostRow = {
  id: string;
};

type QueueDraftRow = {
  id: string;
  workspace_id: string | null;
  connected_account_id: string;
  platform: "threads";
  post_text: string;
  reply_text: string | null;
  reply_texts: string[] | null;
  image_urls: string[] | null;
  created_at: string;
};

type QueueActiveAccountRow = {
  id: string;
  user_id: string;
  platform: string;
  username: string | null;
  display_name: string | null;
  account_status: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeReplyTexts(
  replyTexts: string[] | null | undefined,
  replyText: string | null | undefined,
) {
  if (Array.isArray(replyTexts) && replyTexts.length > 0) {
    return replyTexts.map((value) => value.trim()).filter(Boolean).slice(0, 3);
  }

  if (typeof replyText === "string" && replyText.trim()) {
    return [replyText.trim()];
  }

  return [];
}

function normalizeTimeSlot(slotTime: string) {
  return slotTime.trim().slice(0, 5);
}

function getRandomItem<T>(items: T[]) {
  if (items.length === 0) {
    return null;
  }

  return items[Math.floor(Math.random() * items.length)] ?? null;
}

function mapQueueSettingsRow(
  row: QueueSettingsRow,
  userId: string,
): WorkspaceQueueSettingsRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    userId,
    sourceMode: row.source_mode,
    aiDraftType: row.ai_draft_type,
    timezone: row.timezone,
    randomizePostingTime: row.randomize_posting_time,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapQueueSlotRow(row: {
  id: string;
  weekday: number;
  slot_time: string;
  source_mode: QueueSourceMode;
  ai_draft_type: QueueAiDraftType | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  workspace_queue_settings_id: string;
}): WorkspaceQueueTimeSlotRecord {
  const sourceMode: QueueSourceMode =
    row.source_mode === "ai_random" || row.source_mode === "draft_random"
      ? row.source_mode
      : "ai_type";

  const aiDraftType: QueueAiDraftType | null =
    row.ai_draft_type === "engagement" || row.ai_draft_type === "product"
      ? row.ai_draft_type
      : row.ai_draft_type === "informational"
        ? "informational"
        : null;

  return {
    id: row.id,
    workspaceQueueSettingsId: row.workspace_queue_settings_id,
    weekday: row.weekday as QueueWeekday,
    slotTime: normalizeTimeSlot(row.slot_time),
    sourceMode,
    aiDraftType: sourceMode === "ai_type" ? aiDraftType ?? "informational" : null,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDispatchRunRow(row: QueueDispatchRunRow): WorkspaceQueueDispatchRunRecord {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    workspaceQueueSettingsId: row.workspace_queue_settings_id,
    userId: row.user_id,
    sourceMode: row.source_mode,
    aiDraftType: row.ai_draft_type,
    timezone: row.timezone,
    localDate: row.local_date,
    weekday: row.weekday as QueueWeekday,
    slotTime: normalizeTimeSlot(row.slot_time),
    status: row.status,
    summary: row.summary ?? {},
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    finishedAt: row.finished_at,
  };
}

function mapGeneratedHookRow(row: QueueGeneratedHookRow): QueueGeneratedHookCandidate | null {
  const snapshot = isRecord(row.prompt_snapshot) ? row.prompt_snapshot : null;
  const workspaceId =
    snapshot && typeof snapshot.workspace_id === "string"
      ? snapshot.workspace_id
      : null;
  const draftTypeRaw =
    snapshot && typeof snapshot.draft_type === "string"
      ? snapshot.draft_type
      : null;

  if (!workspaceId || !draftTypeRaw) {
    return null;
  }

  const draftType =
    draftTypeRaw === "informational" ||
    draftTypeRaw === "engagement" ||
    draftTypeRaw === "product"
      ? draftTypeRaw
      : null;

  if (!draftType) {
    return null;
  }

  const outputStyle = row.output_style;
  if (
    outputStyle !== "threads_beta_informational" &&
    outputStyle !== "threads_beta_engagement" &&
    outputStyle !== "threads_beta_product"
  ) {
    return null;
  }

  return {
    hookId: row.id,
    workspaceId,
    draftType,
    outputStyle,
    outputText: row.output_text,
    replyText: row.output_reply_text,
    replyTexts: normalizeReplyTexts(row.output_reply_texts, row.output_reply_text),
    sourcePostIds: row.source_post_ids,
    promptSnapshot: snapshot,
    createdAt: row.created_at,
  };
}

function mapDraftRow(row: QueueDraftRow): QueueDraftCandidate {
  return {
    scheduledPostId: row.id,
    workspaceId: row.workspace_id,
    connectedAccountId: row.connected_account_id,
    platform: row.platform,
    postText: row.post_text,
    replyText: row.reply_text,
    replyTexts: normalizeReplyTexts(row.reply_texts, row.reply_text),
    imageUrls: Array.isArray(row.image_urls)
      ? row.image_urls.map((value) => value.trim()).filter(Boolean).slice(0, 3)
      : [],
    createdAt: row.created_at,
  };
}

async function getWorkspaceOwnerIds(workspaceIds: string[]) {
  if (workspaceIds.length === 0) {
    return new Map<string, string>();
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("workspaces")
    .select("id, user_id")
    .in("id", workspaceIds);

  if (error) {
    throw error;
  }

  const ownerByWorkspaceId = new Map<string, string>();

  for (const row of (data ?? []) as Array<{ id: string; user_id: string }>) {
    ownerByWorkspaceId.set(row.id, row.user_id);
  }

  return ownerByWorkspaceId;
}

async function loadQueueSettingsRows(activeOnly: boolean) {
  const admin = createSupabaseAdminClient();
  const query = admin
    .from("workspace_queue_settings")
    .select(
      `
      id,
      workspace_id,
      source_mode,
      ai_draft_type,
      timezone,
      randomize_posting_time,
      is_active,
      created_at,
      updated_at,
      slots:workspace_queue_time_slots (
        id,
        workspace_queue_settings_id,
        weekday,
        slot_time,
        source_mode,
        ai_draft_type,
        is_active,
        created_at,
        updated_at
      )
    `,
    )
    .order("created_at", { ascending: true });

  if (activeOnly) {
    query.eq("is_active", true);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return (data ?? []) as QueueSettingsRow[];
}

async function hydrateQueueSettingsRows(rows: QueueSettingsRow[]) {
  const ownerByWorkspaceId = await getWorkspaceOwnerIds(
    rows.map((row) => row.workspace_id),
  );

  return rows
    .map((row) => {
      const userId = ownerByWorkspaceId.get(row.workspace_id);
      if (!userId) {
        return null;
      }

      return {
        ...mapQueueSettingsRow(row, userId),
        slots: (row.slots ?? [])
          .map((slot) =>
            mapQueueSlotRow({
              ...slot,
              workspace_queue_settings_id: row.id,
            }),
          )
          .sort((a, b) => {
            if (a.weekday !== b.weekday) {
              return a.weekday - b.weekday;
            }

            return a.slotTime.localeCompare(b.slotTime);
          }),
      } satisfies WorkspaceQueueSettingsWithSlotsRecord;
    })
    .filter((value): value is WorkspaceQueueSettingsWithSlotsRecord => value !== null);
}

export async function listWorkspaceQueueSettings(userId: string) {
  const rows = await loadQueueSettingsRows(false);
  return (await hydrateQueueSettingsRows(rows)).filter(
    (row) => row.userId === userId,
  );
}

export async function listActiveWorkspaceQueueSettings() {
  return hydrateQueueSettingsRows(await loadQueueSettingsRows(true));
}

export async function upsertWorkspaceQueueSettings(input: {
  userId: string;
  workspaceId: string;
  sourceMode: QueueSourceMode;
  aiDraftType?: QueueAiDraftType | null;
  timezone?: string;
  randomizePostingTime?: boolean;
  isActive?: boolean;
}) {
  const admin = createSupabaseAdminClient();
  const { data: workspace, error: workspaceError } = await admin
    .from("workspaces")
    .select("id, user_id")
    .eq("id", input.workspaceId)
    .eq("user_id", input.userId)
    .maybeSingle<{ id: string; user_id: string }>();

  if (workspaceError) {
    throw workspaceError;
  }

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const { data, error } = await admin
    .from("workspace_queue_settings")
    .upsert(
      {
        workspace_id: input.workspaceId,
        source_mode: input.sourceMode,
        ai_draft_type: input.aiDraftType ?? null,
        timezone: input.timezone ?? "Asia/Seoul",
        randomize_posting_time: input.randomizePostingTime ?? false,
        is_active: input.isActive ?? false,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "workspace_id",
      },
    )
    .select(
      "id, workspace_id, source_mode, ai_draft_type, timezone, randomize_posting_time, is_active, created_at, updated_at",
    )
    .single<QueueSettingsRow>();

  if (error) {
    throw error;
  }

  return mapQueueSettingsRow(data, workspace.user_id);
}

export async function replaceWorkspaceQueueTimeSlots(input: {
  workspaceQueueSettingsId: string;
  slots: Array<{
    weekday: QueueWeekday;
    slotTime: string;
    sourceMode: QueueSourceMode;
    aiDraftType: QueueAiDraftType | null;
    isActive?: boolean;
  }>;
}) {
  const admin = createSupabaseAdminClient();
  const normalizedSlots = input.slots
    .map((slot) => ({
      workspace_queue_settings_id: input.workspaceQueueSettingsId,
      weekday: slot.weekday,
      slot_time: normalizeTimeSlot(slot.slotTime),
      source_mode: slot.sourceMode,
      ai_draft_type: slot.sourceMode === "ai_type" ? slot.aiDraftType ?? "informational" : null,
      is_active: slot.isActive ?? true,
      updated_at: new Date().toISOString(),
    }))
    .filter((slot) => slot.slot_time.length > 0);

  const { error: deleteError } = await admin
    .from("workspace_queue_time_slots")
    .delete()
    .eq("workspace_queue_settings_id", input.workspaceQueueSettingsId);

  if (deleteError) {
    throw deleteError;
  }

  if (normalizedSlots.length === 0) {
    return [] as WorkspaceQueueTimeSlotRecord[];
  }

  const { data, error } = await admin
    .from("workspace_queue_time_slots")
    .insert(normalizedSlots)
    .select(
      "id, workspace_queue_settings_id, weekday, slot_time, source_mode, ai_draft_type, is_active, created_at, updated_at",
    )
    .order("weekday", { ascending: true })
    .order("slot_time", { ascending: true });

  if (error) {
    throw error;
  }

  return ((data ?? []) as Array<{
    id: string;
    workspace_queue_settings_id: string;
    weekday: number;
    slot_time: string;
    source_mode: QueueSourceMode;
    ai_draft_type: QueueAiDraftType | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }>).map(mapQueueSlotRow);
}

export async function listEligibleGeneratedHookCandidates(input: {
  userId: string;
  workspaceId: string;
  sourceMode: QueueSourceMode;
  aiDraftType?: QueueAiDraftType | null;
}) {
  const admin = createSupabaseAdminClient();
  if (input.sourceMode === "ai_type" && !input.aiDraftType) {
    return [] as QueueGeneratedHookCandidate[];
  }

  const styles =
    input.sourceMode === "ai_type" && input.aiDraftType
      ? [QUEUE_GENERATED_HOOK_STYLE_BY_DRAFT_TYPE[input.aiDraftType]]
      : [
          QUEUE_GENERATED_HOOK_STYLE_BY_DRAFT_TYPE.informational,
          QUEUE_GENERATED_HOOK_STYLE_BY_DRAFT_TYPE.engagement,
          QUEUE_GENERATED_HOOK_STYLE_BY_DRAFT_TYPE.product,
        ];

  let query = admin
    .from("generated_hooks")
    .select(
      "id, output_text, output_reply_text, output_reply_texts, output_style, source_post_ids, prompt_snapshot, created_at",
    )
    .eq("user_id", input.userId)
    .in("output_style", styles)
    .contains("prompt_snapshot", { workspace_id: input.workspaceId })
    .order("created_at", { ascending: false });

  if (input.sourceMode === "ai_type" && input.aiDraftType) {
    query = query.contains("prompt_snapshot", {
      draft_type: input.aiDraftType,
    });
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  const { data: usedRows, error: usedRowsError } = await admin
    .from("scheduled_posts")
    .select("generated_hook_id")
    .eq("user_id", input.userId)
    .eq("workspace_id", input.workspaceId)
    .in("status", ["scheduled", "processing", "published"])
    .not("generated_hook_id", "is", null);

  if (usedRowsError) {
    throw usedRowsError;
  }

  const usedHookIds = new Set(
    (usedRows ?? [])
      .map((row) => row.generated_hook_id)
      .filter((value): value is string => typeof value === "string"),
  );

  return ((data ?? []) as QueueGeneratedHookRow[])
    .map(mapGeneratedHookRow)
    .filter(
      (candidate): candidate is QueueGeneratedHookCandidate =>
        candidate !== null && !usedHookIds.has(candidate.hookId),
    );
}

export async function pickEligibleGeneratedHookCandidate(input: {
  userId: string;
  workspaceId: string;
  sourceMode: QueueSourceMode;
  aiDraftType?: QueueAiDraftType | null;
}) {
  if (input.sourceMode === "ai_type" && !input.aiDraftType) {
    return null;
  }

  const candidates = await listEligibleGeneratedHookCandidates(input);
  return getRandomItem(candidates);
}

export async function listEligibleDraftCandidates(input: {
  userId: string;
  workspaceId: string;
  activeConnectedAccountIds: string[];
}) {
  if (input.activeConnectedAccountIds.length === 0) {
    return [] as QueueDraftCandidate[];
  }

  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("scheduled_posts")
    .select(
      "id, workspace_id, connected_account_id, platform, post_text, reply_text, reply_texts, image_urls, created_at",
    )
    .eq("user_id", input.userId)
    .eq("workspace_id", input.workspaceId)
    .eq("platform", "threads")
    .eq("status", "draft")
    .is("deleted_at", null)
    .in("connected_account_id", input.activeConnectedAccountIds)
    .order("created_at", { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as QueueDraftRow[]).map(mapDraftRow);
}

export async function pickEligibleDraftCandidate(input: {
  userId: string;
  workspaceId: string;
  activeConnectedAccountIds: string[];
}) {
  const candidates = await listEligibleDraftCandidates(input);
  return getRandomItem(candidates);
}

export async function listActiveThreadsAccountsForUser(userId: string) {
  const admin = createSupabaseAdminClient();
  const { data: accounts, error: accountsError } = await admin
    .from("connected_accounts")
    .select("id, user_id, platform, username, display_name, account_status")
    .eq("user_id", userId)
    .eq("platform", "threads")
    .eq("account_status", "active")
    .order("created_at", { ascending: true });

  if (accountsError) {
    throw accountsError;
  }

  const activeAccounts = (accounts ?? []) as QueueActiveAccountRow[];
  if (activeAccounts.length === 0) {
    return [] as QueueActiveThreadsAccount[];
  }

  const { data: tokenRows, error: tokenError } = await admin
    .from("oauth_tokens")
    .select("connected_account_id")
    .eq("platform", "threads")
    .in(
      "connected_account_id",
      activeAccounts.map((account) => account.id),
    );

  if (tokenError) {
    throw tokenError;
  }

  const tokenAccountIds = new Set(
    (tokenRows ?? [])
      .map((row) => row.connected_account_id)
      .filter((value): value is string => typeof value === "string"),
  );

  return activeAccounts
    .filter((account) => tokenAccountIds.has(account.id))
    .map(
      (account): QueueActiveThreadsAccount => ({
        id: account.id,
        userId: account.user_id,
        platform: "threads",
        username: account.username,
        displayName: account.display_name,
        accountStatus: account.account_status,
      }),
    );
}

export async function createQueueScheduledPost(input: QueueScheduledPostInsertInput) {
  const admin = createSupabaseAdminClient();
  const normalizedImageUrls = (input.imageUrls ?? [])
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 3);
  const normalizedReplyTexts = (input.replyTexts ?? [])
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 3);

  const payload = {
    user_id: input.userId,
    connected_account_id: input.connectedAccountId,
    generated_hook_id: input.generatedHookId,
    workspace_id: input.workspaceId,
    platform: "threads" as const,
    post_text: input.postText,
    image_urls: normalizedImageUrls.length > 0 ? normalizedImageUrls : null,
    reply_text:
      normalizedReplyTexts[0] ?? (typeof input.replyText === "string" ? input.replyText.trim() : null),
    reply_texts: normalizedReplyTexts.length > 0 ? normalizedReplyTexts : null,
    scheduled_for: input.scheduledFor,
    timezone: input.timezone,
    status: "scheduled" as const,
    idempotency_key: input.idempotencyKey,
  };

  const { data, error } = await admin
    .from("scheduled_posts")
    .insert(payload)
    .select("id")
    .single<QueueScheduledPostRow>();

  if (error) {
    throw error;
  }

  return data as QueueScheduledPostReference;
}

export async function createQueueDispatchRun(input: {
  workspaceId: string;
  workspaceQueueSettingsId: string;
  userId: string;
  sourceMode: QueueSourceMode;
  aiDraftType: QueueAiDraftType | null;
  timezone: string;
  localDate: string;
  weekday: QueueWeekday;
  slotTime: string;
  summary?: Record<string, unknown>;
}) {
  const admin = createSupabaseAdminClient();
  const payload = {
    workspace_id: input.workspaceId,
    workspace_queue_settings_id: input.workspaceQueueSettingsId,
    user_id: input.userId,
    source_mode: input.sourceMode,
    ai_draft_type: input.aiDraftType,
    timezone: input.timezone,
    local_date: input.localDate,
    weekday: input.weekday,
    slot_time: normalizeTimeSlot(input.slotTime),
    status: "running" as const,
    summary: input.summary ?? {},
  };

  const { data, error } = await admin
    .from("workspace_queue_dispatch_runs")
    .insert(payload)
    .select(
      "id, workspace_id, workspace_queue_settings_id, user_id, source_mode, ai_draft_type, timezone, local_date, weekday, slot_time, status, summary, error_message, created_at, updated_at, finished_at",
    )
    .single<QueueDispatchRunRow>();

  if (!error && data) {
    return {
      inserted: true,
      run: mapDispatchRunRow(data),
    } as const;
  }

  if (error?.code !== "23505") {
    throw error;
  }

  const { data: existingData, error: existingError } = await admin
    .from("workspace_queue_dispatch_runs")
    .select(
      "id, workspace_id, workspace_queue_settings_id, user_id, source_mode, ai_draft_type, timezone, local_date, weekday, slot_time, status, summary, error_message, created_at, updated_at, finished_at",
    )
    .eq("workspace_id", input.workspaceId)
    .eq("local_date", input.localDate)
    .eq("slot_time", normalizeTimeSlot(input.slotTime))
    .maybeSingle<QueueDispatchRunRow>();

  if (existingError) {
    throw existingError;
  }

  return {
    inserted: false,
    run: existingData ? mapDispatchRunRow(existingData) : null,
  } as const;
}

export async function finalizeQueueDispatchRun(input: {
  dispatchRunId: string;
  status: "success" | "skipped" | "failed";
  summary: Record<string, unknown>;
  errorMessage?: string | null;
}) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("workspace_queue_dispatch_runs")
    .update({
      status: input.status,
      summary: input.summary,
      error_message: input.errorMessage ?? null,
      finished_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.dispatchRunId)
    .select(
      "id, workspace_id, workspace_queue_settings_id, user_id, source_mode, ai_draft_type, timezone, local_date, weekday, slot_time, status, summary, error_message, created_at, updated_at, finished_at",
    )
    .single<QueueDispatchRunRow>();

  if (error) {
    throw error;
  }

  return mapDispatchRunRow(data);
}
