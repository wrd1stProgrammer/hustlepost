import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getRequestLocale } from "@/lib/i18n/request";
import { getDashboardCopy } from "@/lib/i18n/dashboard";
import { listScheduledPosts } from "@/lib/db/publishing";
import { CalendarClient } from "./calendar-client";

export default async function DashboardCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{
    lang?: string;
  }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

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
