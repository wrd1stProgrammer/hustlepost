import "server-only";

import type { ViralCategory } from "@/lib/constants/marketing";
import type { ViralPostSummary } from "@/lib/types/marketing";
import { createSupabaseServerClient } from "@/utils/supabase/server";

type KeywordDrivenViralPost = Omit<ViralPostSummary, "category"> & {
  category: string;
};

function normalizeKeyword(keyword: string) {
  return keyword.trim().replace(/\s+/g, " ");
}

export async function searchViralPosts(input: {
  category: ViralCategory;
  keyword: string;
  limit?: number;
}) {
  const supabase = await createSupabaseServerClient();
  const keyword = normalizeKeyword(input.keyword);
  const limit = Math.min(Math.max(input.limit ?? 12, 1), 50);

  let query = supabase
    .from("viral_posts")
    .select(
      "id, platform, source_url, author_handle, author_name, category, content_text, view_count, like_count, published_at, virality_score",
    )
    .eq("category", input.category)
    .order("virality_score", { ascending: false, nullsFirst: false })
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (keyword) {
    query = query.ilike("content_text", `%${keyword}%`);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as ViralPostSummary[];
}

function rankPosts(left: ViralPostSummary, right: ViralPostSummary) {
  const leftScore = left.virality_score ?? -1;
  const rightScore = right.virality_score ?? -1;

  if (leftScore !== rightScore) {
    return rightScore - leftScore;
  }

  const leftPublished = left.published_at ? new Date(left.published_at).getTime() : 0;
  const rightPublished = right.published_at
    ? new Date(right.published_at).getTime()
    : 0;

  return rightPublished - leftPublished;
}

export async function searchViralPostsByKeywords(input: {
  keywords: string[];
  limit?: number;
}) {
  const supabase = await createSupabaseServerClient();
  const cleanedKeywords = input.keywords
    .map(normalizeKeyword)
    .filter(Boolean)
    .slice(0, 3);
  const limit = Math.min(Math.max(input.limit ?? 12, 1), 50);

  if (cleanedKeywords.length === 0) {
    return [] as ViralPostSummary[];
  }

  const perKeywordLimit = Math.min(Math.max(limit * 2, 6), 30);
  const collected = new Map<string, ViralPostSummary>();

  for (const keyword of cleanedKeywords) {
    const { data, error } = await supabase
      .from("viral_posts")
      .select(
        "id, platform, source_url, author_handle, author_name, category, content_text, view_count, like_count, published_at, virality_score",
      )
      .eq("platform", "threads")
      .ilike("content_text", `%${keyword}%`)
      .order("virality_score", { ascending: false, nullsFirst: false })
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(perKeywordLimit);

    if (error) {
      throw error;
    }

    for (const row of (data ?? []) as ViralPostSummary[]) {
      if (!collected.has(row.id)) {
        collected.set(row.id, row);
      }
    }
  }

  return Array.from(collected.values()).sort(rankPosts).slice(0, limit);
}

export async function searchThreadsViralPostsByKeywords(input: {
  keywords: string[];
  topicCluster?: string;
  limit?: number;
  excludePostIds?: string[];
}) {
  const supabase = await createSupabaseServerClient();
  const keywords = input.keywords
    .map(normalizeKeyword)
    .filter(Boolean)
    .slice(0, 3);
  const totalLimit = Math.min(Math.max(input.limit ?? 12, 1), 120);
  const excludedPostIds = new Set(
    (input.excludePostIds ?? [])
      .map((postId) => postId.trim())
      .filter(Boolean),
  );

  if (keywords.length === 0) {
    return [] as KeywordDrivenViralPost[];
  }

  const exclusionHeadroom = Math.min(excludedPostIds.size, 90);
  const perKeywordLimit = Math.max(
    Math.ceil((totalLimit + exclusionHeadroom) / keywords.length),
    1,
  );
  const deduped = new Map<string, KeywordDrivenViralPost>();

  for (const keyword of keywords) {
    let query = supabase
      .from("viral_posts")
      .select(
        "id, platform, source_url, author_handle, author_name, category, content_text, view_count, like_count, published_at, virality_score",
      )
      .eq("platform", "threads")
      .order("virality_score", { ascending: false, nullsFirst: false })
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(perKeywordLimit)
      .ilike("content_text", `%${keyword}%`);

    if (input.topicCluster) {
      query = query.eq("normalized_metrics->>topic_cluster", input.topicCluster);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    for (const row of (data ?? []) as KeywordDrivenViralPost[]) {
      if (excludedPostIds.has(row.id)) {
        continue;
      }

      deduped.set(row.id, row);
    }
  }

  return Array.from(deduped.values())
    .sort((left, right) => {
      const viralityDelta = (right.virality_score ?? 0) - (left.virality_score ?? 0);
      if (viralityDelta !== 0) return viralityDelta;

      return (
        new Date(right.published_at ?? 0).getTime() -
        new Date(left.published_at ?? 0).getTime()
      );
    })
    .slice(0, totalLimit);
}
