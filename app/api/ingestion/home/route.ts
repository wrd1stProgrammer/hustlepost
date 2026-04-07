import { NextResponse } from "next/server";
import { ensureProfile } from "@/lib/db/accounts";
import { triggerHomeFeedIngestion } from "@/lib/openclaw/ingestion";
import { createSupabaseServerClient } from "@/utils/supabase/server";

async function readBody(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    return (await request.json()) as Record<string, unknown>;
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const formData = await request.formData();

    return {
      topic_cluster: formData.get("topic_cluster"),
      scraper_account: formData.get("scraper_account"),
      locale: formData.get("locale"),
      target_post_count: formData.get("target_post_count"),
    } satisfies Record<string, unknown>;
  }

  return {};
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureProfile(user);

  const body = await readBody(request);
  const topicCluster =
    typeof body.topic_cluster === "string" ? body.topic_cluster.trim() : "";
  const scraperAccount =
    typeof body.scraper_account === "string" ? body.scraper_account.trim() : "";
  const locale = typeof body.locale === "string" ? body.locale.trim() || "ko" : "ko";
  const targetPostCount =
    typeof body.target_post_count === "number"
      ? body.target_post_count
      : typeof body.target_post_count === "string"
        ? Number(body.target_post_count)
        : NaN;

  const normalizedTargetPostCount =
    Number.isFinite(targetPostCount) && targetPostCount > 0
      ? targetPostCount
      : 30;

  if (!topicCluster || !scraperAccount) {
    return NextResponse.json(
      {
        error: "topic_cluster and scraper_account are required",
      },
      { status: 400 },
    );
  }

  try {
    const result = await triggerHomeFeedIngestion({
      topic_cluster: topicCluster,
      locale,
      target_post_count: normalizedTargetPostCount,
      scraper_account: scraperAccount,
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Home ingestion request failed",
      },
      { status: 502 },
    );
  }
}
