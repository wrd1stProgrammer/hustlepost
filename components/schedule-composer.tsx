"use client";

import { CalendarDays, Clock3, Send, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import type { DashboardCopy } from "@/lib/i18n/dashboard";
import type { ConnectedAccountRecord, ScheduledPostRecord } from "@/lib/types/db";

type ScheduleComposerProps = {
  copy: DashboardCopy["scheduler"];
  commonCopy: DashboardCopy["common"];
  accounts: ConnectedAccountRecord[];
  scheduledPosts?: ScheduledPostRecord[];
  schedulePostAction: (formData: FormData) => Promise<void>;
};

function formatAccountLabel(account: ConnectedAccountRecord) {
  const name = account.display_name || account.username || "Unnamed";
  const handle = account.username ? `@${account.username}` : account.platform_user_id;
  return `${account.platform.toUpperCase()} · ${name} (${handle})`;
}

function statusLabel(
  commonCopy: DashboardCopy["common"],
  status: ScheduledPostRecord["status"],
) {
  if (status === "draft") return commonCopy.draft;
  if (status === "scheduled") return commonCopy.scheduled;
  if (status === "processing") return commonCopy.processing;
  if (status === "published") return commonCopy.published;
  if (status === "failed") return commonCopy.failed;
  return commonCopy.cancelled;
}

function formatScheduledFor(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function latestRunStatusLabel(
  commonCopy: DashboardCopy["common"],
  status: NonNullable<ScheduledPostRecord["latest_publish_run"]>["status"],
) {
  if (status === "running") return commonCopy.running;
  if (status === "success") return commonCopy.success;
  return commonCopy.failed;
}

function latestRunStatusClasses(
  status: NonNullable<ScheduledPostRecord["latest_publish_run"]>["status"],
) {
  if (status === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "failed") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function getConnectedAccountLabel(post: ScheduledPostRecord) {
  const account = Array.isArray(post.connected_account)
    ? post.connected_account[0]
    : post.connected_account;

  if (!account) {
    return null;
  }

  return account.username
    ? `@${account.username}`
    : account.display_name || account.id;
}

export function ScheduleComposer({
  copy,
  commonCopy,
  accounts,
  scheduledPosts = [],
  schedulePostAction,
}: ScheduleComposerProps) {
  const timezoneRef = useRef<HTMLInputElement>(null);
  const publishingAccounts = useMemo(
    () =>
      accounts.filter(
        (account) => account.platform === "x" || account.platform === "threads",
      ),
    [accounts],
  );

  useEffect(() => {
    if (!timezoneRef.current) {
      return;
    }

    timezoneRef.current.value =
      Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  }, []);

  return (
    <section className="sticky top-6 overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#fafaf6_100%)] shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
      <div className="border-b border-slate-200/80 px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
              {copy.eyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {copy.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {copy.description}
            </p>
          </div>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700">
            <Sparkles className="h-4 w-4" />
          </div>
        </div>
      </div>

      <div className="space-y-5 px-5 py-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              {copy.publishingAccounts}
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {publishingAccounts.length}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              {copy.queueItems}
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
              {scheduledPosts.length}
            </p>
          </div>
        </div>

        <form
          action={schedulePostAction}
          className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]"
        >
          <input
            ref={timezoneRef}
            type="hidden"
            name="timezone"
            defaultValue="UTC"
          />
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
                {copy.account}
              </label>
              <Clock3 className="h-4 w-4 text-slate-400" />
            </div>
            <select
              name="connectedAccountId"
              defaultValue={publishingAccounts[0]?.id ?? ""}
              disabled={publishingAccounts.length === 0}
              className="w-full rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#ffffff,rgba(248,248,243,0.92))] px-4 py-3 text-sm outline-none transition focus:border-slate-400 disabled:cursor-not-allowed disabled:bg-slate-100"
            >
              {publishingAccounts.length === 0 ? (
                <option value="">{copy.connectAccountFirst}</option>
              ) : null}
              {publishingAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {formatAccountLabel(account)}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
              {copy.postText}
            </label>
            <textarea
              name="postText"
              placeholder={copy.postPlaceholder}
              rows={6}
              className="min-h-[150px] w-full rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,rgba(248,248,243,0.92))] px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-slate-400"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-[0.2em] text-slate-500">
              {copy.scheduledTime}
            </label>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <CalendarDays className="h-4 w-4 text-slate-400" />
              <input
                type="datetime-local"
                name="scheduledFor"
                className="w-full border-none bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={publishingAccounts.length === 0}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Send className="h-4 w-4" />
            {copy.action}
          </button>
        </form>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                {copy.queueTitle}
              </p>
              <h3 className="mt-2 text-sm font-semibold tracking-tight text-slate-950">
                {copy.queueHeading}
              </h3>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {scheduledPosts.length} {copy.items}
            </span>
          </div>

          {scheduledPosts.length === 0 ? (
            <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-white px-4 py-6 text-sm leading-6 text-slate-500">
              {copy.queueEmpty}
            </div>
          ) : (
            <div className="space-y-3">
              {scheduledPosts.map((post) => (
                <article
                  key={post.id}
                  className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        {post.platform}
                      </p>
                      {getConnectedAccountLabel(post) ? (
                        <p className="text-[11px] uppercase tracking-[0.14em] text-slate-500">
                          {getConnectedAccountLabel(post)}
                        </p>
                      ) : null}
                      <p className="max-w-3xl text-sm leading-6 text-slate-900">
                        {post.post_text}
                      </p>
                    </div>
                    <span className="inline-flex shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                      {statusLabel(commonCopy, post.status)}
                    </span>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
                    <span>{formatScheduledFor(post.scheduled_for)}</span>
                    {post.latest_publish_run ? (
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 font-semibold ${latestRunStatusClasses(
                          post.latest_publish_run.status,
                        )}`}
                      >
                        {latestRunStatusLabel(
                          commonCopy,
                          post.latest_publish_run.status,
                        )}
                      </span>
                    ) : null}
                  </div>

                  {post.latest_publish_run ? (
                    <div className="mt-3 border-t border-slate-200 pt-3">
                      {post.latest_publish_run.external_post_url ? (
                        <a
                          href={post.latest_publish_run.external_post_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex text-sm font-medium text-slate-900 underline underline-offset-4"
                        >
                          {copy.openPublishedPost}
                        </a>
                      ) : null}
                      {post.latest_publish_run.status === "failed" &&
                      post.latest_publish_run.error_message ? (
                        <p className="mt-2 text-sm leading-6 text-rose-700">
                          {post.latest_publish_run.error_message}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
