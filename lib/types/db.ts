export type SupportedPlatform = "x" | "threads";

export type ConnectedAccountRecord = {
  id: string;
  platform: SupportedPlatform;
  platform_user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url?: string | null;
  account_status: string;
  created_at: string;
  updated_at: string;
};

export type AccountKeywordRecord = {
  id: string;
  connected_account_id: string;
  keyword: string;
  position: number;
  created_at: string;
  updated_at: string;
};

export type ConnectedAccountWithKeywords = ConnectedAccountRecord & {
  keywords: AccountKeywordRecord[];
};

export type UpsertConnectedAccountInput = {
  userId: string;
  platform: SupportedPlatform;
  platformUserId: string;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  accountStatus?: "active" | "expired" | "revoked" | "error";
};

export type UpsertOauthTokenInput = {
  connectedAccountId: string;
  platform: SupportedPlatform;
  accessToken: string;
  refreshToken?: string | null;
  tokenType?: string | null;
  scopes?: string[];
  expiresAt?: string | null;
  refreshExpiresAt?: string | null;
  metadata?: Record<string, unknown>;
};

export type PublishRunSummary = {
  id: string;
  status: "running" | "success" | "failed";
  error_code: string | null;
  error_message: string | null;
  external_post_id?: string | null;
  external_post_url: string | null;
  finished_at: string | null;
  response_payload?: Record<string, unknown> | null;
};

export type PublishViewMetricsSummary = {
  views: number | null;
  source: "cached" | "permission_denied" | "unavailable";
  fetched_at: string | null;
};

export type ScheduledPostRecord = {
  id: string;
  user_id: string;
  connected_account_id: string;
  generated_hook_id: string | null;
  workspace_id?: string | null;
  platform: SupportedPlatform;
  post_text: string;
  image_urls?: string[] | null;
  reply_text?: string | null;
  reply_texts?: string[] | null;
  scheduled_for: string;
  timezone: string;
  deleted_at?: string | null;
  deleted_source?: "app" | "external" | null;
  status:
    | "draft"
    | "scheduled"
    | "processing"
    | "published"
    | "failed"
    | "cancelled";
  trigger_run_id: string | null;
  created_at: string;
  updated_at: string;
  connected_account?: Pick<
    ConnectedAccountRecord,
    | "id"
    | "platform"
    | "platform_user_id"
    | "username"
    | "display_name"
    | "avatar_url"
    | "account_status"
  > | null;
  latest_publish_run?: PublishRunSummary | null;
  view_metrics?: PublishViewMetricsSummary | null;
};

export type CreateScheduledPostInput = {
  userId: string;
  connectedAccountId: string;
  platform: SupportedPlatform;
  workspaceId?: string | null;
  postText: string;
  imageUrls?: string[] | null;
  replyText?: string | null;
  replyTexts?: string[] | null;
  scheduledFor: string;
  timezone: string;
  idempotencyKey: string;
  generatedHookId?: string | null;
  status?: ScheduledPostRecord["status"];
};
