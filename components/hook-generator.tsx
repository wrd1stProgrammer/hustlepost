import {
  VIRAL_CATEGORIES,
  VIRAL_CATEGORY_LABELS,
  type ViralCategory,
} from "@/lib/constants/marketing";
import type { DashboardCopy } from "@/lib/i18n/dashboard";
import type { SupportedPlatform } from "@/lib/types/db";
import type {
  GeneratedHookRecord,
  ViralPostSummary,
} from "@/lib/types/marketing";
import { BarChart3, Sparkles, Wand2 } from "lucide-react";
import type { ComponentType, ReactNode } from "react";

type HookGeneratorProps = {
  copy: DashboardCopy["hook"];
  topViralPosts?: ViralPostSummary[];
  recentGeneratedHooks?: GeneratedHookRecord[];
  generateHooksAction: (formData: FormData) => Promise<void>;
  initialCategory?: string;
  initialKeyword?: string;
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function platformLabel(platforms: SupportedPlatform[]) {
  return platforms.map((platform) => platform.toUpperCase()).join(" + ");
}

function ToneBadge({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "slate" | "emerald" | "amber";
}) {
  const toneClasses = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
  } as const;

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

function EditorChip({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "slate" | "emerald" | "amber";
}) {
  const toneClasses = {
    slate: "border-slate-200 bg-white text-slate-700",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
  } as const;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] ${toneClasses[tone]}`}
    >
      {children}
    </span>
  );
}

function SurfacePill({
  icon: Icon,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
      <Icon className="h-3.5 w-3.5 text-slate-400" />
      {children}
    </span>
  );
}

export function HookGenerator({
  copy,
  topViralPosts = [],
  recentGeneratedHooks = [],
  generateHooksAction,
  initialCategory,
  initialKeyword,
}: HookGeneratorProps) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(180deg,#fbfbf8_0%,#f4f6f0_100%)] shadow-[0_28px_100px_rgba(15,23,42,0.08)]">
      <div className="border-b border-slate-200/80 bg-white/70 px-6 py-5 backdrop-blur">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.28em] text-emerald-700">
              {copy.eyebrow}
            </p>
            <h2 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
              {copy.title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              {copy.description}
            </p>
          </div>

          <div className="flex flex-col gap-2 xl:items-end">
            <ToneBadge tone="emerald">
              {recentGeneratedHooks.length} {copy.saved}
            </ToneBadge>
            <p className="max-w-xs text-xs leading-5 text-slate-500">
              {copy.helper}
            </p>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <SurfacePill icon={BarChart3}>{copy.previewHeading}</SurfacePill>
          <SurfacePill icon={Sparkles}>{copy.recentHeading}</SurfacePill>
          <SurfacePill icon={Wand2}>{copy.generate}</SurfacePill>
        </div>
      </div>

      <div className="px-5 py-5 sm:px-6 sm:py-6">
        <form
          action={generateHooksAction}
          className="grid gap-4 rounded-[1.75rem] border border-slate-200 bg-white/90 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)] lg:grid-cols-[0.95fr_1.1fr_auto]"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-[0.22em] text-slate-500">
                {copy.categories}
              </span>
              <EditorChip tone="emerald">{VIRAL_CATEGORIES.length}</EditorChip>
            </div>
            <label className="block">
              <span className="sr-only">{copy.categories}</span>
              <select
                name="category"
                defaultValue={
                  initialCategory &&
                  VIRAL_CATEGORIES.includes(initialCategory as ViralCategory)
                    ? initialCategory
                    : VIRAL_CATEGORIES[0]
                }
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm outline-none transition focus:border-slate-400"
              >
                {VIRAL_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {VIRAL_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <div className="mb-2 flex items-center justify-between gap-3">
              <span className="text-xs uppercase tracking-[0.22em] text-slate-500">
                {copy.keyword}
              </span>
              <EditorChip>{copy.previewHeading}</EditorChip>
            </div>
            <div className="rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,rgba(248,248,243,0.88))] px-4 py-4 shadow-inner">
              <input
                name="keyword"
                defaultValue={initialKeyword ?? ""}
                placeholder={copy.keywordPlaceholder}
                className="w-full border-none bg-transparent text-2xl font-medium tracking-tight text-slate-950 outline-none placeholder:text-slate-400"
              />
              <p className="mt-3 text-xs leading-5 text-slate-500">
                {copy.helper}
              </p>
            </div>
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {copy.generate}
            </button>
          </div>
        </form>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white/88 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
            <div className="border-b border-slate-200/80 bg-[linear-gradient(180deg,#ffffff,rgba(248,248,243,0.85))] px-5 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    {copy.preview}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                    {copy.previewHeading}
                  </h3>
                </div>
                <ToneBadge tone="amber">
                  {topViralPosts.length} {copy.matches}
                </ToneBadge>
              </div>
            </div>

            <div className="px-5 py-5">
              {topViralPosts.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-[linear-gradient(180deg,#ffffff,rgba(248,248,243,0.75))] px-5 py-10 text-sm leading-6 text-slate-500">
                  {copy.previewEmpty}
                </div>
              ) : (
                <div className="space-y-3">
                  {topViralPosts.map((post) => (
                    <article
                      key={post.id}
                      className="rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,rgba(247,247,242,0.85))] px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                          {post.platform}
                        </span>
                        <span className="text-xs text-slate-500">
                          {post.virality_score
                            ? `${copy.virality} ${post.virality_score}`
                            : copy.seedPost}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-slate-900">
                        {post.content_text}
                      </p>
                      <div className="mt-4 flex items-center justify-between gap-3 text-xs text-slate-500">
                        <span>
                          {post.author_handle
                            ? `@${post.author_handle}`
                            : post.author_name || copy.unknown}
                        </span>
                        <a
                          href={post.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium text-slate-900 underline underline-offset-4"
                        >
                          {copy.openSource}
                        </a>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white/88 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
            <div className="border-b border-slate-200/80 bg-[linear-gradient(180deg,#ffffff,rgba(238,243,230,0.75))] px-5 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                    {copy.recent}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                    {copy.recentHeading}
                  </h3>
                </div>
                <ToneBadge tone="emerald">
                  {recentGeneratedHooks.length} {copy.total}
                </ToneBadge>
              </div>
            </div>

            <div className="px-5 py-5">
              {recentGeneratedHooks.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-[linear-gradient(180deg,#ffffff,rgba(248,248,243,0.75))] px-5 py-10 text-sm leading-6 text-slate-500">
                  {copy.recentEmpty}
                </div>
              ) : (
                <div className="space-y-3">
                  {recentGeneratedHooks.map((hook) => (
                    <article
                      key={hook.id}
                      className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)]"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                            {VIRAL_CATEGORY_LABELS[hook.category]}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {hook.keyword} · {platformLabel(hook.platform_target)}
                          </p>
                        </div>
                        <span className="text-xs text-slate-500">
                          {formatDate(hook.created_at)}
                        </span>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-900">
                        {hook.output_text}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </section>
  );
}
