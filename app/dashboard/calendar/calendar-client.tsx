"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, isToday, parseISO } from "date-fns";
import { enUS, ko } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import type { listScheduledPosts } from "@/lib/db/publishing";
import type { DashboardCopy } from "@/lib/i18n/dashboard";
import { getIntlLocale, type Locale } from "@/lib/i18n/locales";

type Post = Awaited<ReturnType<typeof listScheduledPosts>>[number];
type ViewMetrics = NonNullable<Post["view_metrics"]>;

type CalendarClientProps = {
  locale: Locale;
  copy: DashboardCopy["pages"]["calendar"];
  posts: Post[];
};

export function CalendarClient({ locale: localeStr, copy, posts }: CalendarClientProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const locale = localeStr === "ko" ? ko : enUS;

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const jumpToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = [];
  let day = startDate;
  while (day <= endDate) {
    days.push(day);
    day = addDays(day, 1);
  }

  const postsByDate = useMemo(() => {
    const map = new Map<string, Post[]>();
    for (const post of posts) {
      if (!post.scheduled_for && post.status === 'draft') continue;
      const dateKey = format(parseISO(post.scheduled_for || post.created_at), "yyyy-MM-dd");
      const list = map.get(dateKey) || [];
      list.push(post);
      map.set(dateKey, list);
    }
    return map;
  }, [posts]);

  const selectedDateKey = format(selectedDate, "yyyy-MM-dd");
  const selectedPosts = postsByDate.get(selectedDateKey) || [];

  const formatCompact = (num: number) => {
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return String(num);
  };

  const getViewDisplay = (metrics: ViewMetrics | null) => {
    if (!metrics) {
      return { value: "—", label: null };
    }

    if (metrics.source === "permission_denied") {
      return { value: "0", label: copy.noAccess };
    }

    if (metrics.source === "unavailable") {
      return { value: "—", label: copy.unavailable };
    }

    return {
      value: metrics.views === null ? "—" : formatCompact(metrics.views),
      label: null,
    };
  };

  const getStatusLabel = (status: Post["status"]) => {
    switch (status) {
      case "scheduled":
        return copy.scheduled;
      case "published":
        return copy.published;
      case "failed":
        return copy.failed;
      case "draft":
        return copy.draft;
      default:
        return status;
    }
  };

  return (
    <div className="flex min-h-full flex-col items-start gap-5 sm:gap-8 lg:flex-row">
      {/* Calendar Section */}
      <div className="flex-1 w-full min-w-0">
        <div className="mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 sm:gap-6">
             <h1 className="text-[26px] font-bold tracking-tight text-slate-900 flex items-center gap-2">
               {copy.title}
             </h1>
             <div className="flex items-center gap-1 text-slate-800 font-semibold bg-white border border-slate-200 shadow-sm rounded-xl p-1 sm:gap-3">
               <button onClick={prevMonth} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><ChevronLeft className="h-4 w-4" /></button>
               <span className="min-w-[108px] px-1 text-center text-[14px] sm:min-w-[120px] sm:text-[15px]">
                 {format(currentDate, "MMMM yyyy", { locale })}
               </span>
               <button onClick={nextMonth} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"><ChevronRight className="h-4 w-4" /></button>
             </div>
             <button onClick={jumpToToday} className="text-sm font-semibold text-slate-500 hover:text-slate-800 bg-white border border-slate-200 shadow-sm px-3 py-1.5 rounded-xl transition">
               {copy.jumpToday}
             </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-white text-center shadow-[0_2px_8px_rgba(15,23,42,0.03)] sm:rounded-[20px]">
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName, dayIndex) => (
              <div key={dayName} className="py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500 sm:py-3 sm:text-[13px] sm:tracking-wider">
                {copy.weekdaysShort[dayIndex] ?? dayName}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 bg-slate-100 gap-[1px]">
            {days.map((date, idx) => {
              const dateKey = format(date, "yyyy-MM-dd");
              const dayPosts = postsByDate.get(dateKey) || [];
              const isCurrent = isSameMonth(date, currentDate);
              const isSelected = isSameDay(date, selectedDate);
              const today = isToday(date);
              
              const MAX_VISIBLE = 4;
              const overflowCount = dayPosts.length - MAX_VISIBLE;
              const hasAnyViewMetrics = dayPosts.some((post) => Boolean(post.view_metrics));
              const totalViews = hasAnyViewMetrics
                ? dayPosts.reduce((acc, post) => acc + (post.view_metrics?.views ?? 0), 0)
                : null;
              const hasPermissionDenied = dayPosts.some(
                (post) => post.view_metrics?.source === "permission_denied",
              );
              const hasUnavailable = dayPosts.some(
                (post) => post.view_metrics?.source === "unavailable",
              );
              const totalViewLabel = hasPermissionDenied
                ? copy.noAccess
                : hasUnavailable
                  ? copy.unavailable
                  : null;

              return (
                <button
                  key={idx}
                  onClick={() => setSelectedDate(date)}
                  className={`relative flex min-h-[76px] flex-col items-stretch p-1 text-left transition-colors outline-none sm:min-h-[96px] sm:p-1.5 lg:min-h-[140px] ${
                    isSelected ? 'bg-blue-50/50 outline outline-2 outline-blue-500 z-10' : 'bg-white hover:bg-slate-50'
                  } ${!isCurrent ? 'opacity-40' : ''}`}
                >
                  <div className="mb-1 flex items-start justify-between px-0.5 sm:mb-1.5">
                     <span className={`inline-flex items-center justify-center text-[12px] font-bold sm:text-[13px] ${
                       today ? 'h-6 w-6 rounded-full bg-blue-600 text-white' : isSelected ? 'text-blue-600' : 'text-slate-600'
                     }`}>
                       {format(date, "d")}
                     </span>
                     {dayPosts.length > 0 && (
                       <div className="flex flex-col items-end text-slate-400">
                         <div className="flex items-center justify-center">
                           <Eye className="mb-0.5 h-3 w-3 opacity-60 sm:h-3.5 sm:w-3.5" />
                         </div>
                         <span className="text-[10px] font-semibold tracking-tight sm:text-[11px]">
                           {totalViews === null ? "—" : formatCompact(totalViews)}
                         </span>
                         {totalViewLabel && (
                           <span className="text-[8px] font-medium uppercase tracking-[0.12em] text-slate-300 sm:text-[9px]">
                             {totalViewLabel}
                           </span>
                         )}
                       </div>
                     )}
                  </div>

                  <div className="flex flex-1 flex-col gap-1 overflow-hidden lg:hidden">
                    {dayPosts.length > 0 ? (
                      <div className="mt-auto flex flex-wrap gap-1">
                        {dayPosts.slice(0, 3).map((post) => (
                          <span
                            key={`${post.id}-mobile`}
                            className={`inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${
                              post.status === "published"
                                ? "bg-emerald-100 text-emerald-700"
                                : post.status === "scheduled"
                                  ? "bg-blue-100 text-blue-700"
                                  : post.status === "failed"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {post.status === "published"
                              ? "P"
                              : post.status === "scheduled"
                                ? "S"
                                : post.status === "failed"
                                  ? "F"
                                  : "D"}
                          </span>
                        ))}
                        {overflowCount > 0 ? (
                          <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold text-slate-500">
                            +{overflowCount}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="hidden flex-1 flex-col gap-1 overflow-hidden lg:flex">
                    {dayPosts.slice(0, MAX_VISIBLE).map(post => {
                      const viewDisplay = getViewDisplay(post.view_metrics ?? null);
                      const isPublished = post.status === 'published';
                      const avatarUrl = (post as any).connected_account?.avatar_url;
                      
                      return (
                        <div 
                          key={post.id} 
                          className={`flex items-center justify-between text-left px-1.5 py-1 rounded-md transition-colors ${
                            isPublished ? 'bg-[#E8F8F0]' : 'bg-slate-50'
                          }`}
                        >
                          <div className="flex flex-1 items-center gap-1.5 min-w-0 pr-1">
                            {avatarUrl ? (
                              <Image
                                src={avatarUrl}
                                alt=""
                                width={14}
                                height={14}
                                className="h-[14px] w-[14px] rounded-full object-cover shrink-0"
                                unoptimized
                              />
                            ) : (
                              <div className="w-[14px] h-[14px] rounded-full bg-slate-300 shrink-0" />
                            )}
                            <span className="truncate text-[11px] font-medium text-slate-800">
                              {post.post_text?.slice(0, 4) || '...'}
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5 shrink-0 text-slate-500">
                            <Eye className="w-3 h-3 opacity-70" />
                            <div className="flex flex-col items-end leading-none">
                              <span className="text-[10px] sm:text-[11px] font-medium">{viewDisplay.value}</span>
                              {viewDisplay.label && (
                                <span className="text-[9px] font-medium uppercase tracking-[0.12em] text-slate-300">
                                  {viewDisplay.label}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {overflowCount > 0 && (
                      <div className="text-[11px] font-medium text-slate-400 px-1 mt-1">
                        +{overflowCount} {copy.more}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Daily Posts Sidebar */}
      <div className="flex w-full shrink-0 self-start flex-col overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_2px_8px_rgba(15,23,42,0.03)] sm:rounded-[20px] lg:w-[340px] lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] xl:w-[380px]">
         <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex-shrink-0">
            <h2 className="text-lg font-bold text-slate-900 flex items-center justify-between">
              <span>{format(selectedDate, copy.dateFormat, { locale })}</span>
              <span className="text-[13px] font-semibold px-2.5 py-1 bg-white border border-slate-200 shadow-sm text-slate-600 rounded-lg">
                {selectedPosts.length}
              </span>
            </h2>
         </div>
         <div className="space-y-3 bg-slate-50/30 p-4 lg:flex-1 lg:overflow-y-auto">
            {selectedPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 bg-white border border-slate-200 rounded-[16px] shadow-sm">
                <CalendarIcon className="h-10 w-10 mb-3 opacity-20" />
                <p className="text-sm font-medium">{copy.noPostsForDay}</p>
              </div>
            ) : (
              selectedPosts.map(post => {
                const isPublished = post.status === 'published';
                const viewDisplay = getViewDisplay(post.view_metrics ?? null);
                
                return (
                  <div key={post.id} className={`rounded-[12px] p-4 shadow-sm ${
                    isPublished ? 'bg-[#E8F8F0]' : 'bg-white border border-slate-200'
                  }`}>
                    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="mr-0 text-[14px] font-bold text-slate-800 line-clamp-2 sm:mr-3 sm:line-clamp-1">
                        {post.post_text || copy.noContent}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <div className="flex items-center text-slate-500 text-[13px] font-semibold gap-1">
                          <Eye className="w-4 h-4" /> {viewDisplay.value}
                        </div>
                        {viewDisplay.label && (
                          <div className="text-[9px] font-medium uppercase tracking-[0.12em] text-slate-300">
                            {viewDisplay.label}
                          </div>
                        )}
                        {isPublished && (
                          <div className="bg-white rounded-full p-[3px] shadow-sm text-blue-500">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                          </div>
                        )}
                         <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md ${
                           isPublished ? 'bg-white text-emerald-700' : 
                           post.status === 'scheduled' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                           post.status === 'failed' ? 'bg-red-50 text-red-600 border border-red-100' :
                           'bg-slate-100 text-slate-600'
                         }`}>
                           {isPublished ? copy.synced : getStatusLabel(post.status)}
                         </span>
                      </div>
                    </div>
                    <div className="text-[12px] text-slate-500 font-semibold opacity-80">
                       {new Intl.DateTimeFormat(getIntlLocale(localeStr), {
                         hour: "numeric",
                         minute: "2-digit",
                       }).format(new Date(post.scheduled_for || post.created_at))}
                    </div>
                  </div>
                );
              })
            )}
         </div>
      </div>
    </div>
  );
}
