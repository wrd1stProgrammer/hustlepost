import type { SupportedPlatform } from "@/lib/types/db";
import type { ViralCategory } from "@/lib/constants/marketing";

export type ViralPostSummary = {
  id: string;
  platform: SupportedPlatform;
  source_url: string;
  author_handle: string | null;
  author_name: string | null;
  category: ViralCategory;
  content_text: string;
  view_count: number | null;
  like_count: number | null;
  published_at: string | null;
  virality_score: number | null;
};

export type GeneratedHookRecord = {
  id: string;
  category: ViralCategory;
  keyword: string;
  platform_target: SupportedPlatform[];
  source_post_ids: string[];
  output_text: string;
  output_reply_text?: string | null;
  output_reply_texts?: string[] | null;
  output_style: string;
  generation_model: string;
  prompt_snapshot?: Record<string, unknown> | null;
  created_at: string;
  is_published?: boolean;
  published_at?: string | null;
  published_account_ids?: string[];
};

export type GenerateHooksInput = {
  userId: string;
  category: ViralCategory;
  keyword: string;
  platformTargets: SupportedPlatform[];
};
