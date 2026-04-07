"use client";

import { useState } from "react";
import { Calendar, Loader2, Send, X } from "lucide-react";

type DraftPublishButtonProps = {
  scheduledPostId: string;
  redirectTo: string;
  locale: "en" | "ko";
  publishAction: (formData: FormData) => Promise<void>;
  scheduleAction: (formData: FormData) => Promise<void>;
};

export function DraftPublishButton({
  scheduledPostId,
  redirectTo,
  locale,
  publishAction,
  scheduleAction,
}: DraftPublishButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState<"publish" | "schedule" | null>(null);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  const copy =
    locale === "ko"
      ? {
          title: "드래프트 발행",
          publishNow: "지금 발행",
          schedule: "예약 발행",
          date: "날짜",
          time: "시간",
          close: "닫기",
          publishing: "발행 중...",
          scheduling: "예약 중...",
        }
      : {
          title: "Publish draft",
          publishNow: "Post now",
          schedule: "Schedule post",
          date: "Date",
          time: "Time",
          close: "Close",
          publishing: "Publishing...",
          scheduling: "Scheduling...",
        };

  async function handlePublishNow() {
    setIsPending("publish");
    setIsOpen(false);
    const formData = new FormData();
    formData.set("scheduledPostId", scheduledPostId);
    formData.set("redirectTo", redirectTo);
    await publishAction(formData);
  }

  async function handleSchedule() {
    if (!scheduleDate || !scheduleTime) {
      return;
    }

    setIsPending("schedule");
    setIsOpen(false);
    const formData = new FormData();
    formData.set("scheduledPostId", scheduledPostId);
    formData.set("redirectTo", redirectTo);
    formData.set("scheduleDate", scheduleDate);
    formData.set("scheduleTime", scheduleTime);
    formData.set(
      "timezone",
      Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    );
    await scheduleAction(formData);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={Boolean(isPending)}
        className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:text-slate-300"
        aria-label={copy.title}
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-[420px] rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-[18px] font-bold text-[#1e2330]">{copy.title}</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
                aria-label={copy.close}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <button
                type="button"
                onClick={handlePublishNow}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#20c997] px-4 py-3 text-sm font-semibold text-[#1e2330] transition hover:bg-[#1db386]"
              >
                <Send className="h-4 w-4" />
                {copy.publishNow}
              </button>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1">
                    <span className="text-[12px] font-semibold text-slate-500">{copy.date}</span>
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(event) => setScheduleDate(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none"
                    />
                  </label>
                  <label className="space-y-1">
                    <span className="text-[12px] font-semibold text-slate-500">{copy.time}</span>
                    <input
                      type="time"
                      value={scheduleTime}
                      onChange={(event) => setScheduleTime(event.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handleSchedule}
                  disabled={!scheduleDate || !scheduleTime}
                  className="mt-4 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Calendar className="h-4 w-4" />
                  {isPending === "schedule" ? copy.scheduling : copy.schedule}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
