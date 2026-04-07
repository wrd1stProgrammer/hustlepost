import { redirect } from "next/navigation";
import { ensureProfile } from "@/lib/db/accounts";
import { listGeneratedHooks } from "@/lib/db/generated-hooks";
import { getDashboardCopy } from "@/lib/i18n/dashboard";
import { getRequestLocale } from "@/lib/i18n/request";
import { searchViralPosts } from "@/lib/db/viral-posts";
import { generateHooksAction } from "../actions";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { VIRAL_CATEGORIES, type ViralCategory } from "@/lib/constants/marketing";
import { HookGenerator } from "@/components/hook-generator";

export default async function DashboardStudioPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    keyword?: string;
    lang?: string;
  }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await ensureProfile(user);
  const params = await searchParams;
  const locale = await getRequestLocale(params.lang);
  
  const recentGeneratedHooks = await listGeneratedHooks(user.id);
  const shouldLoadViralPosts =
    typeof params.category === "string" &&
    typeof params.keyword === "string" &&
    VIRAL_CATEGORIES.includes(params.category as ViralCategory) &&
    params.keyword.trim().length > 0;
    
  const topViralPosts = shouldLoadViralPosts
    ? await searchViralPosts({
        category: params.category as ViralCategory,
        keyword: params.keyword!,
        limit: 8,
      })
    : [];
    
  const dashboardCopy = getDashboardCopy(locale);

  return (
    <div className="p-8 lg:p-12 max-w-[1600px] mx-auto min-h-full">
      <HookGenerator
        copy={dashboardCopy.hook}
        topViralPosts={topViralPosts}
        recentGeneratedHooks={recentGeneratedHooks}
        generateHooksAction={generateHooksAction}
        initialCategory={params.category}
        initialKeyword={params.keyword}
      />
    </div>
  );
}
