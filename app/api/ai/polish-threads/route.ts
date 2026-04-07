import { NextResponse } from "next/server";
import { polishThreadsDraft } from "@/lib/ai";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    text?: string;
    workspaceName?: string;
    keywords?: string[];
    customization?: {
      targetAudience?: string;
      productLink?: string;
      commonInstruction?: string;
      informationalFocus?: string;
      engagementFocus?: string;
      productFocus?: string;
    };
  };

  if (!body.text?.trim()) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }

  if (!process.env.GLM_API_KEY) {
    return NextResponse.json({ error: "Missing GLM_API_KEY" }, { status: 500 });
  }

  const result = await polishThreadsDraft({
    text: body.text,
    workspaceName: body.workspaceName,
    keywords: body.keywords,
    customization: body.customization,
  });

  return NextResponse.json({ text: result.hooks[0] ?? body.text });
}
