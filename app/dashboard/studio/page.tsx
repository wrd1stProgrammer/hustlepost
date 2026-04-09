import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { listGeneratedHooks } from "@/lib/db/generated-hooks";
import { getDashboardCopy } from "@/lib/i18n/dashboard";
import { getRequestLocale } from "@/lib/i18n/request";
import { searchViralPosts } from "@/lib/db/viral-posts";
import { generateHooksAction } from "../actions";
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
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

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
    <div className="mx-auto min-h-full max-w-[1600px] px-4 py-5 sm:p-8 lg:p-12">
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
