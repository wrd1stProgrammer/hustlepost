import type { ScheduledPostRecord } from "@/lib/types/db";

export type QueueSourceMode = "ai_type" | "ai_random" | "draft_random";

export type QueueAiDraftType = "informational" | "engagement" | "product";

export type QueueWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type QueueDispatchStatus = "running" | "success" | "skipped" | "failed";

export type QueueGeneratedHookOutputStyle =
  | "threads_beta_informational"
  | "threads_beta_engagement"
  | "threads_beta_product";

export const QUEUE_GENERATED_HOOK_STYLE_BY_DRAFT_TYPE = {
  informational: "threads_beta_informational",
  engagement: "threads_beta_engagement",
  product: "threads_beta_product",
} as const satisfies Record<QueueAiDraftType, QueueGeneratedHookOutputStyle>;

export const QUEUE_DRAFT_TYPE_BY_OUTPUT_STYLE = {
  threads_beta_informational: "informational",
  threads_beta_engagement: "engagement",
  threads_beta_product: "product",
} as const satisfies Record<QueueGeneratedHookOutputStyle, QueueAiDraftType>;

export type WorkspaceQueueSettingsRecord = {
  id: string;
  workspaceId: string;
  userId: string;
  sourceMode: QueueSourceMode;
  aiDraftType: QueueAiDraftType | null;
  timezone: string;
  randomizePostingTime: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceQueueTimeSlotRecord = {
  id: string;
  workspaceQueueSettingsId: string;
  weekday: QueueWeekday;
  slotTime: string;
  sourceMode: QueueSourceMode;
  aiDraftType: QueueAiDraftType | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceQueueSettingsWithSlotsRecord = WorkspaceQueueSettingsRecord & {
  slots: WorkspaceQueueTimeSlotRecord[];
};

export type WorkspaceQueueDispatchRunRecord = {
  id: string;
  workspaceId: string;
  workspaceQueueSettingsId: string;
  userId: string;
  sourceMode: QueueSourceMode;
  aiDraftType: QueueAiDraftType | null;
  timezone: string;
  localDate: string;
  weekday: QueueWeekday;
  slotTime: string;
  status: QueueDispatchStatus;
  summary: Record<string, unknown>;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  finishedAt: string | null;
};

export type QueueGeneratedHookCandidate = {
  hookId: string;
  workspaceId: string;
  draftType: QueueAiDraftType;
  outputStyle: QueueGeneratedHookOutputStyle;
  outputText: string;
  replyText: string | null;
  replyTexts: string[];
  sourcePostIds: string[];
  promptSnapshot: Record<string, unknown> | null;
  createdAt: string;
};

export type QueueDraftCandidate = {
  scheduledPostId: string;
  workspaceId: string | null;
  connectedAccountId: string;
  platform: "threads";
  postText: string;
  replyText: string | null;
  replyTexts: string[];
  imageUrls: string[];
  createdAt: string;
};

export type QueueActiveThreadsAccount = {
  id: string;
  userId: string;
  platform: "threads";
  username: string | null;
  displayName: string | null;
  accountStatus: string;
};

export type QueueDispatchSummary = {
  settingsMatched: number;
  slotsMatched: number;
  dispatchRunsCreated: number;
  duplicateDispatchRuns: number;
  generatedRuns: number;
  draftRuns: number;
  scheduledPostsCreated: number;
  publishedPosts: number;
  failedPosts: number;
  skippedRuns: number;
  skippedNoActiveThreadsAccounts: number;
  skippedNoEligibleCandidate: number;
};

export type QueueScheduledPostInsertInput = {
  userId: string;
  workspaceId: string;
  connectedAccountId: string;
  generatedHookId: string | null;
  postText: string;
  replyText: string | null;
  replyTexts: string[] | null;
  imageUrls: string[] | null;
  scheduledFor: string;
  timezone: string;
  idempotencyKey: string;
};

export type QueueScheduledPostReference = Pick<ScheduledPostRecord, "id">;
