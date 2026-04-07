import { redirect } from "next/navigation";
import { ensureProfile } from "@/lib/db/accounts";
import { getRequestLocale } from "@/lib/i18n/request";
import { getDashboardCopy } from "@/lib/i18n/dashboard";
import { listScheduledPosts } from "@/lib/db/publishing";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { CalendarClient } from "./calendar-client";

export default async function DashboardCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{
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
  const copy = getDashboardCopy(locale);
  const scheduledPosts = await listScheduledPosts(user.id, {
    resolveViewMetrics: true,
  });

  return (
    <div className="p-8 lg:p-12 max-w-[1600px] mx-auto min-h-full">
      <CalendarClient posts={scheduledPosts} locale={locale} copy={copy.pages.calendar} />
    </div>
  );
}
