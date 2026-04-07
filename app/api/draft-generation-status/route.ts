import { NextResponse } from "next/server";
import { getDraftGenerationStage } from "@/lib/ai/draft-generation-progress";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestId = url.searchParams.get("requestId")?.trim() ?? "";
  if (!requestId) {
    return NextResponse.json({ error: "requestId is required" }, { status: 400 });
  }

  let stage: Awaited<ReturnType<typeof getDraftGenerationStage>> = null;
  try {
    stage = await getDraftGenerationStage({ requestId });
  } catch {
    stage = null;
  }

  return NextResponse.json({
    stage: stage ?? "unknown",
  });
}
