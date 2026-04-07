"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
  type RefObject,
} from "react";
import { useFormStatus } from "react-dom";
import {
  Calendar,
  Clock3,
  Copy,
  Heart,
  ImagePlus,
  Info,
  Loader2,
  MessageCircle,
  Plus,
  Search,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import type { ConnectedAccountWithKeywords } from "@/lib/types/db";
import type { GeneratedHookRecord } from "@/lib/types/marketing";
import type { WorkspaceRecord } from "@/lib/dashboard/workspaces";
import { ConnectedAccountAvatar } from "@/components/connected-account-avatar";
import { DashboardToast } from "@/components/dashboard-toast";
import { getConnectedAccountDisplayLabel } from "@/lib/accounts/avatar";

type Locale = "en" | "ko";
type DraftType = "informational" | "engagement" | "product";
type ComposeMode = "direct" | "ai";
const THREADS_TEXT_LIMIT = 500;
const THREADS_IMAGE_LIMIT = 3;

function formatCountByLocale(locale: Locale, value: number) {
  if (locale === "ko") {
    return `${value}개`;
  }

  return `${value} item${value === 1 ? "" : "s"}`;
}

type UploadedComposerImage = {
  path: string;
  url: string;
  name: string;
};

type BetaDraftStudioProps = {
  locale: Locale;
  accounts: ConnectedAccountWithKeywords[];
  drafts: GeneratedHookRecord[];
  generateDraftsAction: (formData: FormData) => Promise<void>;
  feedback?: {
    type: "error" | "success";
    message: string;
  } | null;
  activeAccountId?: string;
  activeWorkspace: WorkspaceRecord;
  connectAccountHref: string;
  publishDraftNowAction: (formData: FormData) => Promise<void>;
  saveDraftPostsAction: (formData: FormData) => Promise<void>;
  scheduleGeneratedDraftAction: (formData: FormData) => Promise<void>;
  renderedAt: string;
};

const COPY = {
  en: {
    title: "Create text post",
    searchFilter: "Search & Filter",
    remember: "Remember",
    mainCaption: "Main Caption",
    direct: "Direct",
    ai: "AI",
    aiPolish: "Polish with AI",
    aiPolishing: "Polishing...",
    aiModeTitle: "Draft generation mode",
    scheduleTitle: "Schedule post",
    pickTime: "Pick a time",
    addToQueue: "Add to queue",
    selectDate: "Select date",
    selectTime: "Select time",
    schedule: "Schedule",
    scheduling: "Scheduling...",
    postNow: "Post now",
    posting: "Posting...",
    saveDrafts: "Save to Drafts",
    savingDrafts: "Saving...",
    generate: "Generate drafts",
    useDraft: "Use draft",
    publishDraft: "Publish draft",
    published: "Published",
    replyCaption: "First reply",
    additionalReplyCaption: "Reply",
    addReply: "Add sub-post",
    addImage: "Add image",
    uploadingImages: "Uploading...",
    imageUploadFailed: "Image upload failed.",
    removeReply: "Remove",
    removeImage: "Remove image",
    replyPlaceholder: "Write a follow-up reply.",
    publishNowCta: "Publish now",
    scheduleLaterCta: "Schedule this draft",
    cancel: "Cancel",
    types: {
      informational: "Informational",
      engagement: "Engagement",
      product: "Product-led",
    },
    workspace: "Workspace",
    workspaceLink: "Manage workspace settings",
    noKeywords: "This workspace needs up to 3 saved keywords first.",
    noDrafts: "No generated drafts yet for this workspace.",
    refineHint:
      "When AI mode is on, you can drop rough text here first and polish it before generating final variants.",
    scheduleHint:
      "This panel is for direct writing mode. Switch to AI mode to generate grouped drafts on the right.",
    placeholder:
      "Write your post here, or pick one of the generated drafts below to bring it into the editor.",
  },
  ko: {
    title: "Create text post",
    searchFilter: "Search & Filter",
    remember: "Remember",
    mainCaption: "Main Caption",
    direct: "직접",
    ai: "AI",
    aiPolish: "AI로 글 다듬기",
    aiPolishing: "다듬는 중...",
    aiModeTitle: "글 생성 모드",
    scheduleTitle: "Schedule post",
    pickTime: "Pick a time",
    addToQueue: "Add to queue",
    selectDate: "Select date",
    selectTime: "Select time",
    schedule: "Schedule",
    scheduling: "예약 중...",
    postNow: "Post now",
    posting: "발행 중...",
    saveDrafts: "Save to Drafts",
    savingDrafts: "저장 중...",
    generate: "글 생성",
    useDraft: "초안 사용",
    publishDraft: "초안 발행",
    published: "발행됨",
    replyCaption: "첫 댓글",
    additionalReplyCaption: "쓰레드",
    addReply: "쓰레드 추가",
    addImage: "이미지 추가",
    uploadingImages: "업로드 중...",
    imageUploadFailed: "이미지 업로드에 실패했습니다.",
    removeReply: "삭제",
    removeImage: "이미지 삭제",
    replyPlaceholder: "후속 댓글로 들어갈 쓰레드를 적어주세요.",
    publishNowCta: "지금 발행",
    scheduleLaterCta: "이 초안 예약 발행",
    cancel: "닫기",
    types: {
      informational: "정보성",
      engagement: "참여성",
      product: "홍보성",
    },
    workspace: "Workspace",
    workspaceLink: "워크스페이스 설정 열기",
    noKeywords: "이 워크스페이스는 키워드 3개를 먼저 저장해야 합니다.",
    noDrafts: "이 워크스페이스에 생성된 초안이 아직 없습니다.",
    refineHint:
      "AI 모드에서는 초안이 거칠어도 먼저 적고, AI로 다듬기 버튼으로 문장을 정리할 수 있습니다.",
    scheduleHint:
      "이 패널은 직접 입력 모드용입니다. AI 모드에서는 우측 패널이 글 생성 모드로 바뀝니다.",
    placeholder:
      "직접 글을 쓰거나, 아래 생성된 3가지 타입 카드 중 하나를 눌러 입력란으로 가져오세요.",
  },
} as const;

function DraftActionButton({
  idle,
  pending,
  className,
  disabled = false,
  icon,
}: {
  idle: string;
  pending: string;
  className?: string;
  disabled?: boolean;
  icon?: ReactNode;
}) {
  const { pending: isPending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={isPending || disabled}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-[18px] px-4 py-3 text-sm font-semibold transition active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ""}`}
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : icon}
      {isPending ? pending : idle}
    </button>
  );
}

function GenerateDraftActionButton({
  idle,
  className,
  disabled = false,
}: {
  idle: string;
  className?: string;
  disabled?: boolean;
}) {
  const { pending: isPending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={isPending || disabled}
      className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-[18px] px-4 py-3 text-sm font-semibold transition active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-50 ${className ?? ""}`}
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {idle}
    </button>
  );
}

function DraftGenerationOverlay({
  locale,
}: {
  locale: Locale;
}) {
  const router = useRouter();
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [stage, setStage] = useState<"preparing" | "generating">("preparing");

  useEffect(() => {
    const checkStorage = () => {
      const id = localStorage.getItem("hustle_draft_generating");
      if (id && id !== activeRequestId) {
        setActiveRequestId(id);
        setStage("preparing");
      } else if (!id && activeRequestId) {
        setActiveRequestId(null);
      }
    };
    checkStorage();

    const handleStart = () => checkStorage();
    window.addEventListener("hustle_draft_started", handleStart);
    return () => window.removeEventListener("hustle_draft_started", handleStart);
  }, [activeRequestId]);

  useEffect(() => {
    if (!activeRequestId) return;

    let stopped = false;
    const startedAt = Date.now();
    const hardTimeoutMs = 12 * 60 * 1000;
    const unknownGraceMs = 20_000;
    let unknownSince: number | null = null;
    const fallbackTimer = window.setTimeout(() => {
      if (!stopped) setStage("generating");
    }, 8000);

    const pollStage = async () => {
      try {
        const response = await fetch(
          `/api/draft-generation-status?requestId=${encodeURIComponent(activeRequestId)}`,
          { method: "GET", credentials: "same-origin", cache: "no-store" }
        );
        if (!response.ok) return;
        const data = (await response.json()) as { stage?: string };

        if (data.stage === "draft_generating") {
          unknownSince = null;
          setStage("generating");
        } else if (data.stage === "data_preparing") {
          unknownSince = null;
          setStage("preparing");
        } else if (data.stage === "done") {
          unknownSince = null;
          localStorage.removeItem("hustle_draft_generating");
          setActiveRequestId(null);
          router.refresh();
        } else if (data.stage === "error") {
          unknownSince = null;
          localStorage.removeItem("hustle_draft_generating");
          setActiveRequestId(null);
          router.refresh();
        } else if (data.stage === "unknown") {
          if (!unknownSince) {
            unknownSince = Date.now();
            return;
          }

          if (Date.now() - unknownSince > unknownGraceMs) {
            localStorage.removeItem("hustle_draft_generating");
            setActiveRequestId(null);
            router.refresh();
          }
        }
      } catch {
        // ignore
      }
    };

    const interval = window.setInterval(() => {
      if (Date.now() - startedAt > hardTimeoutMs) {
        localStorage.removeItem("hustle_draft_generating");
        setActiveRequestId(null);
        router.refresh();
        return;
      }
      void pollStage();
    }, 2500);
    void pollStage();

    return () => {
      stopped = true;
      window.clearTimeout(fallbackTimer);
      window.clearInterval(interval);
    };
  }, [activeRequestId, router]);

  if (!activeRequestId) return null;

  const labels = locale === "ko"
      ? { preparing: "데이터 준비중...", generating: "초안 생성중..." }
      : { preparing: "Preparing data...", generating: "Generating drafts..." };

  const currentLabel = stage === "preparing" ? labels.preparing : labels.generating;

  return (
    <div className="absolute -inset-x-8 -inset-y-8 z-[100] flex flex-col items-center justify-start pt-[20vh] bg-white/65 backdrop-blur-[12px] rounded-3xl">
      <div className="w-[340px] overflow-hidden flex flex-col items-center text-center rounded-[28px] border border-white/60 bg-white/80 px-8 py-10 shadow-[0_32px_64px_-12px_rgba(16,185,129,0.12)] backdrop-blur-2xl">
        <div className="relative mb-6 flex h-14 w-14 items-center justify-center rounded-[18px] bg-emerald-50 border border-emerald-100 shadow-inner">
          <div className="absolute inset-0 rounded-[18px] bg-emerald-400/20 blur-xl animate-pulse" />
          <Sparkles className="relative z-10 h-6 w-6 text-emerald-500 animate-[pulse_2s_infinite]" />
        </div>
        
        <h3 className="mb-2.5 text-[18px] font-bold tracking-tight text-slate-900">
          {currentLabel}
        </h3>
        <p className="mb-8 text-[13px] font-medium leading-relaxed text-slate-500">
          {locale === "ko" ? "수집된 데이터를 바탕으로 결과물을 구성합니다. 거의 진행되었습니다." : "We are structuring drafts from the provided context. Almost done."}
        </p>

        <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-slate-100 shadow-inner">
           <div className="absolute bottom-0 left-0 top-0 w-full animate-pulse bg-emerald-500 rounded-full" />
           <div className="absolute bottom-0 left-0 top-0 w-[40%] rounded-full bg-emerald-300 opacity-60 mix-blend-overlay animate-[ping_2s_infinite]" />
        </div>
      </div>
    </div>
  );
}

function getDraftType(draft: GeneratedHookRecord): DraftType {
  if (draft.output_style === "threads_beta_engagement") return "engagement";
  if (draft.output_style === "threads_beta_product") return "product";
  return "informational";
}

function formatDraftText(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return value;

  const jsonMatch = trimmed.match(/\{[\s\S]*\}$/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as { hooks?: unknown };
      if (Array.isArray(parsed.hooks)) {
        return parsed.hooks
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter(Boolean)
          .join("\n\n");
      }
    } catch {
      // ignore
    }
  }

  return value;
}

function getPromptSnapshotValue(
  draft: GeneratedHookRecord,
  key: string,
): string | null {
  const snapshot = draft.prompt_snapshot;
  if (!snapshot || typeof snapshot !== "object") return null;

  const value = snapshot[key];
  return typeof value === "string" ? value : null;
}

function normalizeReplyTexts(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .slice(0, 3);
}

function getStoredDraftReplyTexts(draft: GeneratedHookRecord) {
  const storedReplyTexts = normalizeReplyTexts(draft.output_reply_texts);
  if (storedReplyTexts.length > 0) {
    return storedReplyTexts;
  }

  if (typeof draft.output_reply_text === "string" && draft.output_reply_text.trim()) {
    return [draft.output_reply_text.trim()];
  }

  const snapshot = draft.prompt_snapshot;
  if (snapshot && typeof snapshot === "object") {
    const fromSnapshot = normalizeReplyTexts(snapshot["thread_reply_texts"]);
    if (fromSnapshot.length > 0) {
      return fromSnapshot;
    }
  }

  const fallbackReply = getPromptSnapshotValue(draft, "thread_reply_text") ?? "";
  return fallbackReply ? [fallbackReply] : [];
}

function formatRelativeDraftTime(
  locale: Locale,
  createdAt?: string | null,
  relativeBaseIso?: string,
) {
  if (!createdAt) return null;

  const createdTime = new Date(createdAt).getTime();
  if (Number.isNaN(createdTime)) return null;

  const baseTime = relativeBaseIso ? new Date(relativeBaseIso).getTime() : Date.now();
  if (Number.isNaN(baseTime)) return null;

  const diffMs = Math.max(baseTime - createdTime, 0);
  const diffMinutes = Math.max(Math.floor(diffMs / 60000), 1);

  if (diffMinutes < 60) {
    return locale === "ko" ? `${diffMinutes}분 전` : `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return locale === "ko" ? `${diffHours}시간 전` : `${diffHours}h ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return locale === "ko" ? `${diffDays}일 전` : `${diffDays}d ago`;
}

function ThreadsPreviewCard({
  locale,
  label,
  draft,
  accountLabel,
  account,
  extraSelectedAccountsCount,
  selected,
  draftText,
  replyTexts,
  isEditing,
  onUse,
  onDraftTextChange,
  onDraftReplyTextChange,
  onOpenPublish,
  relativeBaseIso,
}: {
  locale: Locale;
  label: string;
  draft?: GeneratedHookRecord;
  accountLabel: string;
  account: ConnectedAccountWithKeywords | null;
  extraSelectedAccountsCount: number;
  selected: boolean;
  draftText: string;
  replyTexts: string[];
  isEditing: boolean;
  onUse: (draft: GeneratedHookRecord) => void;
  onDraftTextChange: (draftId: string, value: string) => void;
  onDraftReplyTextChange: (draftId: string, replyIndex: number, value: string) => void;
  onOpenPublish: (draft: GeneratedHookRecord) => void;
  relativeBaseIso: string;
}) {
  const t = COPY[locale];
  const body = draftText.trim();
  const isInteractive = Boolean(draft && body);
  const isPublished = Boolean(draft?.is_published);
  const normalizedReplyTexts = replyTexts
    .map((value) => value.trim())
    .filter(Boolean);
  const hasReply = normalizedReplyTexts.length > 0;
  const relativeTime = formatRelativeDraftTime(
    locale,
    draft?.created_at,
    relativeBaseIso,
  );

  return (
    <div
      onClick={() => {
        if (draft && body) {
          onUse(draft);
        }
      }}
      role={isInteractive ? "button" : undefined}
      tabIndex={isInteractive ? 0 : -1}
      onKeyDown={(event) => {
        if (draft && body && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onUse(draft);
        }
      }}
      className={`relative flex min-h-[220px] w-full flex-col bg-transparent px-5 py-5 text-left transition ${
        isPublished
          ? "bg-slate-100 text-slate-400"
          : selected
            ? "bg-slate-50/90 ring-1 ring-inset ring-slate-200"
            : isInteractive
              ? "hover:bg-slate-50/70"
              : ""
      } ${isInteractive ? "cursor-pointer" : "cursor-default"}`}
    >
      <div className="flex items-start gap-3">
        {account ? (
          <div className="relative m-[4px]">
            <ConnectedAccountAvatar
              account={account}
              size={34}
              showPlatformBadge={false}
              className="mt-0.5"
              initialsClassName="text-[14px]"
            />
            {extraSelectedAccountsCount > 0 ? (
              <span className="absolute -bottom-1 -right-1 inline-flex min-w-[22px] items-center justify-center rounded-full bg-[#1e2330] px-1.5 py-0.5 text-[10px] font-semibold text-white">
                +{extraSelectedAccountsCount}
              </span>
            ) : null}
          </div>
        ) : (
          <div className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[#1a1c29] text-[14px] font-bold text-white shadow-sm">
            T
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className={`truncate text-[14px] font-bold ${isPublished ? "text-slate-500" : "text-[#1e2330]"}`}>
                {accountLabel}
              </span>
              <span className="text-[13px] text-slate-400">·</span>
              <span className="truncate text-[13px] text-slate-500">{label}</span>
            </div>
            {relativeTime ? (
              <span className="shrink-0 text-[12px] font-medium text-slate-400">
                {relativeTime}
              </span>
            ) : null}
          </div>

          <div className={`mt-1.5 whitespace-pre-wrap text-[14px] leading-relaxed ${isPublished ? "text-slate-500" : "text-[#334155]"}`}>
            {draft && isEditing ? (
                <textarea
                  ref={(node) => {
                    if (!node) return;
                    node.style.height = "0px";
                    node.style.height = `${node.scrollHeight}px`;
                  }}
                  value={draftText}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => onDraftTextChange(draft.id, event.target.value)}
                  onInput={(event) => {
                    const target = event.currentTarget;
                    target.style.height = "0px";
                    target.style.height = `${target.scrollHeight}px`;
                  }}
                  autoFocus
                  spellCheck={false}
                  className={`min-h-[120px] w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-[14px] leading-relaxed outline-none ${
                    isPublished ? "text-slate-500" : "text-[#334155]"
                  }`}
                />
            ) : body ? (
              body
            ) : (
              <span className="text-slate-300">
                {locale === "ko"
                  ? "이 타입으로 생성된 초안이 아직 없습니다."
                  : "No draft generated yet for this type."}
              </span>
            )}
          </div>

          <div className="mt-4 flex items-center gap-5 text-slate-400">
            <div className="flex items-center gap-1.5">
              <Heart className="h-5 w-5" strokeWidth={1.8} />
              <span className="text-[13px]">0</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MessageCircle className="h-5 w-5" strokeWidth={1.8} />
              <span className="text-[13px]">0</span>
            </div>
            <Send className="h-5 w-5" strokeWidth={1.8} />
            {draft ? (
              isPublished ? (
                <span className="ml-auto bg-slate-200 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                  {t.published}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpenPublish(draft);
                  }}
                  className="ml-auto inline-flex cursor-pointer items-center justify-center p-1.5 text-slate-400 transition hover:text-slate-700"
                  aria-label={locale === "ko" ? "초안 발행 옵션 열기" : "Open draft publish options"}
                >
                  <Calendar className="h-5 w-5" strokeWidth={1.8} />
                </button>
              )
            ) : null}
          </div>

          {hasReply
            ? normalizedReplyTexts.map((replyBody, replyIndex) => (
                <div key={`${draft?.id ?? "reply"}-${replyIndex}`} className="relative mt-5">
                  <div className="absolute left-[14px] top-[-10px] h-8 w-px bg-slate-200" />
                  <div className="flex items-start gap-2.5">
                    {account ? (
                      <div className="relative mt-0.5">
                        <ConnectedAccountAvatar
                          account={account}
                          size={30}
                          showPlatformBadge={false}
                          initialsClassName="text-[12px]"
                        />
                      </div>
                    ) : (
                      <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#1a1c29] text-[12px] font-bold text-white shadow-sm">
                        T
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className={`truncate text-[13px] font-bold ${isPublished ? "text-slate-500" : "text-[#1e2330]"}`}>
                          {accountLabel}
                        </span>
                        <span className="text-[12px] text-slate-400">·</span>
                        <span className="truncate text-[12px] text-slate-500">
                          {replyIndex === 0 ? t.replyCaption : `${t.additionalReplyCaption} ${replyIndex + 1}`}
                        </span>
                      </div>
                      <div className={`mt-1 whitespace-pre-wrap text-[14px] leading-relaxed ${isPublished ? "text-slate-500" : "text-[#334155]"}`}>
                        {draft && isEditing ? (
                          <textarea
                            ref={(node) => {
                              if (!node) return;
                              node.style.height = "0px";
                              node.style.height = `${node.scrollHeight}px`;
                            }}
                            value={replyTexts[replyIndex] ?? ""}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) =>
                              onDraftReplyTextChange(draft.id, replyIndex, event.target.value)
                            }
                            onInput={(event) => {
                              const target = event.currentTarget;
                              target.style.height = "0px";
                              target.style.height = `${target.scrollHeight}px`;
                            }}
                            spellCheck={false}
                            maxLength={THREADS_TEXT_LIMIT}
                            className={`min-h-[72px] w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-[14px] leading-relaxed outline-none ${
                              isPublished ? "text-slate-500" : "text-[#334155]"
                            }`}
                          />
                        ) : (
                          replyBody
                        )}
                      </div>
                      <div className="mt-4 flex items-center gap-5 text-slate-400">
                        <div className="flex items-center gap-1.5">
                          <Heart className="h-5 w-5" strokeWidth={1.8} />
                          <span className="text-[13px]">0</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MessageCircle className="h-5 w-5" strokeWidth={1.8} />
                          <span className="text-[13px]">0</span>
                        </div>
                        <Send className="h-5 w-5" strokeWidth={1.8} />
                      </div>
                    </div>
                  </div>
                </div>
              ))
            : null}
        </div>
      </div>
    </div>
  );
}

function DraftPublishModal({
  locale,
  draft,
  workspaceId,
  postText,
  connectedAccountIdsJson,
  replyTexts,
  selectedAccountSummary,
  timezone,
  scheduleDate,
  scheduleTime,
  onScheduleDateChange,
  onScheduleTimeChange,
  onClose,
  publishDraftNowAction,
  scheduleGeneratedDraftAction,
}: {
  locale: Locale;
  draft: GeneratedHookRecord;
  workspaceId: string;
  postText: string;
  connectedAccountIdsJson: string;
  replyTexts: string[];
  selectedAccountSummary: string;
  timezone: string;
  scheduleDate: string;
  scheduleTime: string;
  onScheduleDateChange: (value: string) => void;
  onScheduleTimeChange: (value: string) => void;
  onClose: () => void;
  publishDraftNowAction: (formData: FormData) => Promise<void>;
  scheduleGeneratedDraftAction: (formData: FormData) => Promise<void>;
}) {
  const t = COPY[locale];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[460px] rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-[18px] font-bold text-[#1e2330]">{t.publishDraft}</h3>
            <p className="mt-1 text-[12px] font-medium text-slate-400">{selectedAccountSummary}</p>
            <p className="mt-2 line-clamp-3 text-[13px] leading-6 text-slate-500">{postText}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
            aria-label={t.cancel}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-6 space-y-3">
          <form action={publishDraftNowAction} className="space-y-3">
            <input type="hidden" name="connectedAccountIdsJson" value={connectedAccountIdsJson} />
            <input type="hidden" name="generatedHookId" value={draft.id} />
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <input type="hidden" name="postText" value={postText} />
            <input type="hidden" name="replyTextsJson" value={JSON.stringify(replyTexts)} />
            <input type="hidden" name="timezone" value={timezone} />
            <DraftActionButton
              idle={t.publishNowCta}
              pending={locale === "ko" ? "발행 중..." : "Publishing..."}
              className="w-full rounded-xl bg-[#20c997] py-3 text-[#1e2330] hover:bg-[#1db386]"
              disabled={!connectedAccountIdsJson || !postText.trim()}
            />
          </form>

          <form action={scheduleGeneratedDraftAction} className="space-y-3">
            <input type="hidden" name="connectedAccountIdsJson" value={connectedAccountIdsJson} />
            <input type="hidden" name="generatedHookId" value={draft.id} />
            <input type="hidden" name="workspaceId" value={workspaceId} />
            <input type="hidden" name="postText" value={postText} />
            <input type="hidden" name="replyTextsJson" value={JSON.stringify(replyTexts)} />
            <input type="hidden" name="timezone" value={timezone} />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                name="scheduleDate"
                value={scheduleDate}
                onChange={(event) => onScheduleDateChange(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none"
              />
              <input
                type="time"
                name="scheduleTime"
                value={scheduleTime}
                onChange={(event) => onScheduleTimeChange(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none"
              />
            </div>
            <DraftActionButton
              idle={t.scheduleLaterCta}
              pending={locale === "ko" ? "예약 중..." : "Scheduling..."}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 text-slate-700 hover:bg-slate-50"
              disabled={!connectedAccountIdsJson || !postText.trim() || !scheduleDate || !scheduleTime}
            />
          </form>
        </div>
      </div>
    </div>
  );
}

export function BetaDraftStudio({
  locale,
  accounts,
  drafts,
  generateDraftsAction,
  feedback,
  activeAccountId,
  activeWorkspace,
  connectAccountHref,
  publishDraftNowAction,
  saveDraftPostsAction,
  scheduleGeneratedDraftAction,
  renderedAt,
}: BetaDraftStudioProps) {
  const t = COPY[locale];
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(
    activeAccountId && accounts.some((account) => account.id === activeAccountId)
      ? [activeAccountId]
      : accounts[0]
        ? [accounts[0].id]
        : [],
  );
  const [composeMode, setComposeMode] = useState<ComposeMode>("direct");
  const [composerText, setComposerText] = useState("");
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleMode, setScheduleMode] = useState<"time" | "queue">("time");
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");
  const [informationalCount, setInformationalCount] = useState(1);
  const [engagementCount, setEngagementCount] = useState(1);
  const [productCount, setProductCount] = useState(1);
  const [isPolishing, startPolishing] = useTransition();
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [draftTextById, setDraftTextById] = useState<Record<string, string>>({});
  const [draftReplyTextsById, setDraftReplyTextsById] = useState<Record<string, string[]>>({});
  const [composerReplyTexts, setComposerReplyTexts] = useState<string[]>([]);
  const [composerImages, setComposerImages] = useState<UploadedComposerImage[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const [publishModalDraftId, setPublishModalDraftId] = useState<string | null>(null);
  const [draftScheduleDate, setDraftScheduleDate] = useState("");
  const [draftScheduleTime, setDraftScheduleTime] = useState("");
  const [generationRequestId, setGenerationRequestId] = useState("");
  const [scrollIndicators, setScrollIndicators] = useState<
    Record<DraftType, { visible: boolean; canScroll: boolean; thumbTop: number; thumbHeight: number }>
  >({
    informational: { visible: false, canScroll: false, thumbTop: 0, thumbHeight: 0 },
    engagement: { visible: false, canScroll: false, thumbTop: 0, thumbHeight: 0 },
    product: { visible: false, canScroll: false, thumbTop: 0, thumbHeight: 0 },
  });
  const scheduleDateInputRef = useRef<HTMLInputElement>(null);
  const scheduleTimeInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const scrollHideTimersRef = useRef<Record<DraftType, ReturnType<typeof setTimeout> | null>>({
    informational: null,
    engagement: null,
    product: null,
  });
  const scrollAreaRefs = useRef<Record<DraftType, HTMLDivElement | null>>({
    informational: null,
    engagement: null,
    product: null,
  });
  const [browserTimezone, setBrowserTimezone] = useState("UTC");

  const issueGenerationRequestId = () => {
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    setGenerationRequestId(id);
    return id;
  };

  useEffect(() => {
    const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    setBrowserTimezone(detectedTimezone);
  }, []);

  const selectedAccounts = useMemo(
    () => accounts.filter((account) => selectedAccountIds.includes(account.id)),
    [accounts, selectedAccountIds],
  );
  const primarySelectedAccount = selectedAccounts[0] ?? null;
  const extraSelectedAccountsCount = Math.max(selectedAccounts.length - 1, 0);
  const selectedAccountIdsJson = JSON.stringify(selectedAccounts.map((account) => account.id));
  const selectedAccountSummary =
    selectedAccounts.length === 0
      ? locale === "ko"
        ? "선택된 계정 없음"
        : "No selected accounts"
      : locale === "ko"
        ? `${selectedAccounts.length}개 계정에 발행: ${selectedAccounts
            .map((account) => `@${account.username ?? account.display_name ?? "account"}`)
            .join(", ")}`
      : `Publishing to ${selectedAccounts.length} account(s): ${selectedAccounts
          .map((account) => `@${account.username ?? account.display_name ?? "account"}`)
          .join(", ")}`;
  const normalizedComposerReplyTexts = composerReplyTexts.slice(0, 3);
  const composerImageUrls = composerImages.map((image) => image.url);
  const hasEmptyComposerReply = normalizedComposerReplyTexts.some(
    (value) => !value.trim(),
  );
  const canSubmitComposer =
    selectedAccounts.length > 0 &&
    Boolean(composerText.trim()) &&
    !hasEmptyComposerReply &&
    !isUploadingImages;

  const filteredDrafts = useMemo(() => {
    return drafts.filter((draft) => {
      const workspaceId = getPromptSnapshotValue(draft, "workspace_id");
      if (workspaceId) {
        return workspaceId === activeWorkspace.id;
      }

      return activeWorkspace.keywords.some((keyword) =>
        draft.keyword.includes(keyword),
      );
    });
  }, [drafts, activeWorkspace]);

  const groupedDrafts = useMemo(() => {
    const grouped: Record<DraftType, GeneratedHookRecord[]> = {
      informational: [],
      engagement: [],
      product: [],
    };

    for (const draft of filteredDrafts) {
      grouped[getDraftType(draft)].push(draft);
    }

    return grouped;
  }, [filteredDrafts]);

  const selectedDraft = useMemo(
    () => filteredDrafts.find((draft) => draft.id === selectedDraftId) ?? null,
    [filteredDrafts, selectedDraftId],
  );

  const publishModalDraft = useMemo(
    () => filteredDrafts.find((draft) => draft.id === publishModalDraftId) ?? null,
    [filteredDrafts, publishModalDraftId],
  );
  const canSchedule = scheduleEnabled ? Boolean(scheduleDate && scheduleTime) : true;

  function openNativePicker(ref: RefObject<HTMLInputElement | null>) {
    const input = ref.current;
    if (!input) return;

    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.click();
  }

  function getDraftText(draft: GeneratedHookRecord) {
    return draftTextById[draft.id] ?? formatDraftText(draft.output_text);
  }

  function getDraftReplyTexts(draft: GeneratedHookRecord) {
    return draftReplyTextsById[draft.id] ?? getStoredDraftReplyTexts(draft);
  }

  function getStoredReplyTextsForDraftId(draftId: string) {
    const draft = filteredDrafts.find((candidate) => candidate.id === draftId);
    return draft ? getDraftReplyTexts(draft) : [];
  }

  function handleUseDraft(draft: GeneratedHookRecord) {
    const text = getDraftText(draft);
    if (!text) return;

    setSelectedDraftId(draft.id);
    setEditingDraftId(draft.id);
    setComposerText(text);
    setComposerReplyTexts(getDraftReplyTexts(draft));
    setComposeMode("direct");
  }

  function handleDraftTextChange(draftId: string, value: string) {
    setDraftTextById((current) => ({
      ...current,
      [draftId]: value,
    }));

    if (selectedDraftId === draftId) {
      setComposerText(value);
    }
  }

  function handleDraftReplyTextChange(draftId: string, replyIndex: number, value: string) {
    setDraftReplyTextsById((current) => {
      const nextReplyTexts = [...(current[draftId] ?? getStoredReplyTextsForDraftId(draftId))];
      nextReplyTexts[replyIndex] = value.slice(0, THREADS_TEXT_LIMIT);

      return {
        ...current,
        [draftId]: nextReplyTexts,
      };
    });

    if (selectedDraftId === draftId) {
      setComposerReplyTexts((current) => {
        const nextReplyTexts = [...current];
        nextReplyTexts[replyIndex] = value.slice(0, THREADS_TEXT_LIMIT);
        return nextReplyTexts;
      });
    }
  }

  function handleComposerReplyTextChange(replyIndex: number, value: string) {
    const nextValue = value.slice(0, THREADS_TEXT_LIMIT);

    setComposerReplyTexts((current) => {
      const nextReplyTexts = [...current];
      nextReplyTexts[replyIndex] = nextValue;
      return nextReplyTexts;
    });

    if (selectedDraftId) {
      setDraftReplyTextsById((current) => {
        const nextReplyTexts = [...(current[selectedDraftId] ?? getStoredReplyTextsForDraftId(selectedDraftId))];
        nextReplyTexts[replyIndex] = nextValue;
        return {
          ...current,
          [selectedDraftId]: nextReplyTexts,
        };
      });
    }
  }

  function addComposerReplyText() {
    setComposerReplyTexts((current) => {
      if (current.length >= 3) return current;
      return [...current, ""];
    });

    if (selectedDraftId) {
      setDraftReplyTextsById((current) => {
        const nextReplyTexts = [...(current[selectedDraftId] ?? getStoredReplyTextsForDraftId(selectedDraftId))];
        if (nextReplyTexts.length >= 3) {
          return current;
        }
        nextReplyTexts.push("");
        return {
          ...current,
          [selectedDraftId]: nextReplyTexts,
        };
      });
    }
  }

  function removeComposerReplyText(replyIndex: number) {
    setComposerReplyTexts((current) =>
      current.filter((_, currentIndex) => currentIndex !== replyIndex),
    );

    if (selectedDraftId) {
      setDraftReplyTextsById((current) => {
        const nextReplyTexts = [...(current[selectedDraftId] ?? getStoredReplyTextsForDraftId(selectedDraftId))].filter(
          (_, currentIndex) => currentIndex !== replyIndex,
        );
        return {
          ...current,
          [selectedDraftId]: nextReplyTexts,
        };
      });
    }
  }

  function openComposerImagePicker() {
    imageInputRef.current?.click();
  }

  async function handleComposerImageSelection(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const input = event.currentTarget;
    const selectedFiles = Array.from(input.files ?? []);
    const remainingSlots = Math.max(THREADS_IMAGE_LIMIT - composerImages.length, 0);
    const nextFiles = selectedFiles.slice(0, remainingSlots);

    input.value = "";

    if (nextFiles.length === 0) {
      return;
    }

    setIsUploadingImages(true);
    setImageUploadError(null);

    try {
      const formData = new FormData();
      for (const file of nextFiles) {
        formData.append("images", file);
      }

      const response = await fetch("/api/uploads/threads-images", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json().catch(() => null)) as
        | {
            images?: UploadedComposerImage[];
            error?: string;
          }
        | null;

      if (!response.ok) {
        throw new Error(data?.error || t.imageUploadFailed);
      }

      const uploadedImages = Array.isArray(data?.images) ? data.images : [];
      if (uploadedImages.length === 0) {
        throw new Error(t.imageUploadFailed);
      }

      setComposerImages((current) =>
        [...current, ...uploadedImages].slice(0, THREADS_IMAGE_LIMIT),
      );
    } catch (error) {
      setImageUploadError(
        error instanceof Error ? error.message : t.imageUploadFailed,
      );
    } finally {
      setIsUploadingImages(false);
    }
  }

  function removeComposerImage(imageIndex: number) {
    setComposerImages((current) =>
      current.filter((_, currentIndex) => currentIndex !== imageIndex),
    );
    setImageUploadError(null);
  }

  function updateScrollIndicator(type: DraftType, shouldShow: boolean) {
    const element = scrollAreaRefs.current[type];
    if (!element) return;

    const { scrollTop, scrollHeight, clientHeight } = element;
    const canScroll = scrollHeight > clientHeight + 1;
    const thumbHeight = canScroll
      ? Math.max((clientHeight / scrollHeight) * clientHeight, 36)
      : 0;
    const maxScrollTop = Math.max(scrollHeight - clientHeight, 1);
    const maxThumbTop = Math.max(clientHeight - thumbHeight, 0);
    const thumbTop = canScroll ? (scrollTop / maxScrollTop) * maxThumbTop : 0;

    setScrollIndicators((current) => ({
      ...current,
      [type]: {
        visible: shouldShow && canScroll,
        canScroll,
        thumbTop,
        thumbHeight,
      },
    }));

    const existingTimer = scrollHideTimersRef.current[type];
    if (existingTimer) {
      clearTimeout(existingTimer);
      scrollHideTimersRef.current[type] = null;
    }

    if (!shouldShow || !canScroll) {
      return;
    }

    scrollHideTimersRef.current[type] = setTimeout(() => {
      updateScrollIndicator(type, false);
    }, 700);
  }

  async function handlePolish() {
    if (!composerText.trim()) return;

    startPolishing(async () => {
      const response = await fetch("/api/ai/polish-threads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: composerText,
          workspaceName: activeWorkspace.name,
          keywords: activeWorkspace.keywords,
          customization: activeWorkspace.customization,
        }),
      });

      if (!response.ok) return;

      const data = (await response.json()) as { text?: string };
      if (data.text) {
        setComposerText(data.text);
      }
    });
  }

  return (
    <div className="relative isolate z-20 space-y-8 pointer-events-auto">
      <DraftGenerationOverlay locale={locale} />
      <DashboardToast
        toast={feedback}
        clearKeys={[
          "error",
          "drafts",
          "draft_count",
          "published",
          "published_count",
          "failed_count",
          "scheduled",
          "scheduled_count",
          "draft_saved",
          "draft_saved_count",
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 text-[13px] font-medium text-slate-500">
          <Search className="h-4 w-4" />
          {t.searchFilter}
        </div>
        <div className="flex items-center gap-2 text-[13px] font-medium text-slate-500">
          <span className="h-5 w-5 rounded-full border-[1.5px] border-[#20c997]" />
          {t.remember}
        </div>
      </div>

      <div className="relative z-20 space-y-5 pointer-events-auto">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="relative z-20 flex flex-wrap items-center gap-2.5">
              {accounts.map((account) => {
                const isActive = selectedAccountIds.includes(account.id);

                return (
                  <button
                    key={account.id}
                    type="button"
                    onClick={() =>
                      setSelectedAccountIds((currentIds) =>
                        currentIds.includes(account.id)
                          ? currentIds.filter((currentId) => currentId !== account.id)
                          : [...currentIds, account.id],
                      )
                    }
                    className={`relative z-10 m-[3px] flex cursor-pointer items-center justify-center rounded-full transition-all duration-200 ${
                      isActive
                        ? "scale-100 opacity-100"
                        : "scale-95 opacity-50 grayscale hover:scale-100 hover:opacity-100 hover:grayscale-0"
                    }`}
                    aria-pressed={isActive}
                    title={getConnectedAccountDisplayLabel(account)}
                  >
                    <ConnectedAccountAvatar
                      account={account}
                      size={37}
                      initialsClassName="text-[15px]"
                      ringColorClassName={isActive ? "ring-[#20c997]" : "ring-[#cbd5e1]"}
                    />
                  </button>
                );
              })}
              <a
                href={connectAccountHref}
                className="inline-flex h-[50px] w-[50px] shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-slate-300 bg-white text-slate-400 transition-all hover:border-slate-400 hover:text-slate-700 hover:bg-slate-50 shadow-sm"
                title={locale === "ko" ? "Threads 계정 추가 연결" : "Connect another Threads account"}
                aria-label={locale === "ko" ? "Threads 계정 추가 연결" : "Connect another Threads account"}
              >
                <Plus className="h-5 w-5" strokeWidth={2.5} />
              </a>
          </div>

          <div className="relative z-20 inline-flex rounded-full bg-[#dce4ef] p-0.5 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.15)]">
            <button
              type="button"
              onClick={() => setComposeMode("direct")}
              className={`min-w-[58px] cursor-pointer rounded-full px-3 py-1 text-[12px] font-semibold transition ${
                composeMode === "direct"
                  ? "border border-white bg-white text-slate-900 shadow-[0_2px_8px_rgba(15,23,42,0.06)]"
                  : "border border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              {t.direct}
            </button>
            <button
              type="button"
              onClick={() => setComposeMode("ai")}
              className={`min-w-[58px] cursor-pointer rounded-full px-3 py-1 text-[12px] font-semibold transition ${
                composeMode === "ai"
                  ? "border border-white bg-white text-slate-900 shadow-[0_2px_8px_rgba(15,23,42,0.06)]"
                  : "border border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              {t.ai}
            </button>
          </div>
        </div>

        {!primarySelectedAccount ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white/75 px-4 py-3 text-[13px] text-slate-500">
            {locale === "ko"
              ? "상단 프로필을 클릭해 이 워크스페이스에 사용할 계정을 선택하세요."
              : "Pick an account above to decide which connected profile this workspace should use."}
          </div>
        ) : null}

        <div className="relative z-20 grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="relative z-20 mt-6 min-w-0 pointer-events-auto lg:mt-8">
            <div className="mb-3 flex items-center justify-between gap-4">
              <p className="flex items-center gap-1.5 text-[14px] font-bold text-[#4b5563]">
                {t.mainCaption}
                <Info className="h-[14px] w-[14px] text-slate-400" />
              </p>
              <div className="flex items-center gap-2">
                {composeMode === "direct" ? (
                  <>
                    <button
                      type="button"
                      onClick={addComposerReplyText}
                      disabled={composerReplyTexts.length >= 3}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#d2dbe7] bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
                    >
                      <Plus className="h-3 w-3" />
                      {t.addReply}
                    </button>
                    <button
                      type="button"
                      onClick={openComposerImagePicker}
                      disabled={
                        composerImages.length >= THREADS_IMAGE_LIMIT ||
                        isUploadingImages
                      }
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#d2dbe7] bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
                    >
                      {isUploadingImages ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <ImagePlus className="h-3 w-3" />
                      )}
                      {isUploadingImages ? t.uploadingImages : t.addImage}
                    </button>
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      multiple
                      className="sr-only"
                      onChange={handleComposerImageSelection}
                    />
                  </>
                ) : null}
                {composeMode === "ai" ? (
                  <button
                    type="button"
                    onClick={handlePolish}
                    disabled={!composerText.trim() || isPolishing}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[#d2dbe7] bg-white px-3 py-1.5 text-[12px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm"
                  >
                    {isPolishing ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    {isPolishing ? t.aiPolishing : t.aiPolish}
                  </button>
                ) : null}
              </div>
            </div>

            <div className="relative z-20 rounded-xl border border-[#e2e8f0] bg-white px-6 py-5 shadow-[0_4px_12px_rgba(0,0,0,0.03)] pointer-events-auto">
              <textarea
                value={composerText}
                onChange={(event) => setComposerText(event.target.value)}
                placeholder={t.placeholder}
                spellCheck={false}
                className="min-h-[160px] w-full resize-none border-0 bg-transparent text-[15px] leading-relaxed text-slate-800 outline-none placeholder:text-slate-300"
              />
              {composerReplyTexts.length > 0 ? (
                <div className="relative mt-5 border-t border-slate-100 pt-4">
                  {composerReplyTexts.map((replyText, replyIndex) => (
                    <div
                      key={`composer-reply-${replyIndex}`}
                      className={replyIndex === 0 ? "relative" : "relative mt-4"}
                    >
                      <div className="absolute left-[14px] top-0 h-7 w-px bg-slate-200" />
                      <div className="flex items-start gap-2.5">
                        {primarySelectedAccount ? (
                          <ConnectedAccountAvatar
                            account={primarySelectedAccount}
                            size={30}
                            showPlatformBadge={false}
                            initialsClassName="text-[12px]"
                          />
                        ) : (
                          <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-[#1a1c29] text-[12px] font-bold text-white shadow-sm">
                            T
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center justify-between gap-3">
                            <p className="text-[12px] font-semibold text-slate-500">
                              {replyIndex === 0
                                ? t.replyCaption
                                : `${t.additionalReplyCaption} ${replyIndex + 1}`}
                            </p>
                            <div className="flex items-center gap-3">
                              <span className="text-[11px] font-medium text-slate-400">
                                {replyText.length}/{THREADS_TEXT_LIMIT}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeComposerReplyText(replyIndex)}
                                className="cursor-pointer text-[11px] font-medium text-slate-400 transition hover:text-slate-700"
                              >
                                {t.removeReply}
                              </button>
                            </div>
                          </div>
                          <textarea
                            value={replyText}
                            onChange={(event) =>
                              handleComposerReplyTextChange(replyIndex, event.target.value)
                            }
                            spellCheck={false}
                            maxLength={THREADS_TEXT_LIMIT}
                            className="min-h-[82px] w-full resize-none border-0 bg-transparent p-0 text-[14px] leading-relaxed text-slate-700 outline-none placeholder:text-slate-300"
                            placeholder={t.replyPlaceholder}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              {composerImages.length > 0 ? (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <div className="flex flex-wrap gap-2">
                    {composerImages.map((image, imageIndex) => (
                      <div
                        key={`${image.path}-${imageIndex}`}
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2"
                      >
                        <div
                          className="h-9 w-9 rounded-md bg-slate-200 bg-cover bg-center"
                          style={{ backgroundImage: `url(${image.url})` }}
                          aria-hidden="true"
                        />
                        <div className="min-w-0">
                          <p className="max-w-[130px] truncate text-[12px] font-medium text-slate-600">
                            {image.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {imageIndex + 1}/{THREADS_IMAGE_LIMIT}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeComposerImage(imageIndex)}
                          className="ml-1 inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-slate-400 transition hover:bg-white hover:text-slate-700"
                          aria-label={t.removeImage}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              {imageUploadError ? (
                <p className="mt-3 text-[12px] font-medium text-red-500">
                  {imageUploadError}
                </p>
              ) : null}
              <div className="mt-2 flex items-end justify-between gap-6 text-sm text-slate-400">
                {composeMode === "ai" ? (
                  <p className="max-w-[72%] text-[12px] leading-5">
                    {t.refineHint}
                  </p>
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-[13px] font-medium text-slate-400">{composerText.length}/500</span>
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-slate-200" />
                </div>
              </div>
            </div>
          </div>

          <div className="relative z-20 pointer-events-auto">
            {composeMode === "direct" ? (
              <div className="relative z-20 rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)] pointer-events-auto">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[15px] font-bold text-[#1e2330]">
                      {t.scheduleTitle}
                    </h3>
                    <p className="mt-1 text-[12px] font-medium text-slate-400">{selectedAccountSummary}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setScheduleEnabled((value) => !value)}
                    className={`relative h-[24px] w-[46px] cursor-pointer rounded-full transition ${
                      scheduleEnabled
                        ? "bg-[#20c997]"
                        : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`absolute top-[3px] h-[18px] w-[18px] rounded-full bg-white transition shadow-sm ${
                        scheduleEnabled
                          ? "left-[25px]"
                          : "left-[3px]"
                      }`}
                    />
                  </button>
                </div>

                {!scheduleEnabled ? (
                  <div className="mt-6 space-y-3">
                    <form action={publishDraftNowAction}>
                      <input type="hidden" name="connectedAccountIdsJson" value={selectedAccountIdsJson} />
                      <input type="hidden" name="workspaceId" value={activeWorkspace.id} />
                      <input type="hidden" name="postText" value={composerText} />
                      <input type="hidden" name="imageUrlsJson" value={JSON.stringify(composerImageUrls)} />
                      <input
                        type="hidden"
                        name="replyTextsJson"
                        value={JSON.stringify(normalizedComposerReplyTexts)}
                      />
                      <input type="hidden" name="timezone" value={browserTimezone} />
                      <DraftActionButton
                        idle={t.postNow}
                        pending={t.posting}
                        icon={<Send className="h-[18px] w-[18px]" />}
                        disabled={!canSubmitComposer}
                        className="flex w-full rounded-xl bg-[#20c997] px-4 py-3.5 text-[14px] font-bold text-white shadow-sm enabled:hover:bg-emerald-400"
                      />
                    </form>
                    <form action={saveDraftPostsAction}>
                      <input type="hidden" name="connectedAccountIdsJson" value={selectedAccountIdsJson} />
                      <input type="hidden" name="workspaceId" value={activeWorkspace.id} />
                      <input type="hidden" name="postText" value={composerText} />
                      <input type="hidden" name="imageUrlsJson" value={JSON.stringify(composerImageUrls)} />
                      <input
                        type="hidden"
                        name="replyTextsJson"
                        value={JSON.stringify(normalizedComposerReplyTexts)}
                      />
                      <input type="hidden" name="timezone" value={browserTimezone} />
                      <DraftActionButton
                        idle={t.saveDrafts}
                        pending={t.savingDrafts}
                        icon={<Copy className="h-[18px] w-[18px]" />}
                        disabled={!canSubmitComposer}
                        className="mt-2 flex w-full rounded-xl px-4 py-2 text-[13px] font-semibold text-[#64748b] enabled:hover:bg-slate-50 enabled:hover:text-slate-800"
                      />
                    </form>
                  </div>
                ) : (
                  <div className="mt-5 space-y-4">
                    <div className="inline-flex rounded-xl bg-[#f1f5f9] p-1">
                      <button
                        type="button"
                        onClick={() => setScheduleMode("time")}
                        className={`cursor-pointer rounded-lg px-4 py-2 text-[13px] font-semibold transition ${
                          scheduleMode === "time"
                            ? "bg-white text-[#1e2330] shadow-sm"
                            : "text-[#64748b]"
                        }`}
                      >
                        {t.pickTime}
                      </button>
                      <button
                        type="button"
                        onClick={() => setScheduleMode("queue")}
                        className={`cursor-pointer rounded-lg px-4 py-2 text-[13px] font-semibold transition ${
                          scheduleMode === "queue"
                            ? "bg-white text-[#1e2330] shadow-sm"
                            : "text-[#64748b]"
                        }`}
                      >
                        {t.addToQueue}
                      </button>
                    </div>

                    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_24px] items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openNativePicker(scheduleDateInputRef)}
                        className="flex min-w-0 cursor-pointer items-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-3 py-3 text-left"
                      >
                        <Calendar className="h-4 w-4 text-slate-500" />
                        <span className="truncate text-[13px] text-slate-500">
                          {scheduleDate || t.selectDate}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => openNativePicker(scheduleTimeInputRef)}
                        className="flex min-w-0 cursor-pointer items-center gap-2 rounded-xl border border-[#e2e8f0] bg-white px-3 py-3 text-left"
                      >
                        <Clock3 className="h-4 w-4 text-slate-500" />
                        <span className="truncate text-[13px] text-slate-500">
                          {scheduleTime || t.selectTime}
                        </span>
                      </button>
                      <Info className="h-4 w-4 justify-self-center text-slate-400" />
                    </div>

                    <input
                      ref={scheduleDateInputRef}
                      type="date"
                      value={scheduleDate}
                      onChange={(event) => setScheduleDate(event.target.value)}
                      className="sr-only"
                      tabIndex={-1}
                      aria-hidden="true"
                    />
                    <input
                      ref={scheduleTimeInputRef}
                      type="time"
                      value={scheduleTime}
                      onChange={(event) => setScheduleTime(event.target.value)}
                      className="sr-only"
                      tabIndex={-1}
                      aria-hidden="true"
                    />

                    {scheduleMode === "time" ? (
                      <form action={scheduleGeneratedDraftAction}>
                        <input type="hidden" name="connectedAccountIdsJson" value={selectedAccountIdsJson} />
                        <input type="hidden" name="workspaceId" value={activeWorkspace.id} />
                        <input type="hidden" name="postText" value={composerText} />
                        <input type="hidden" name="imageUrlsJson" value={JSON.stringify(composerImageUrls)} />
                        <input
                          type="hidden"
                          name="replyTextsJson"
                          value={JSON.stringify(normalizedComposerReplyTexts)}
                        />
                        <input type="hidden" name="timezone" value={browserTimezone} />
                        <input type="hidden" name="scheduleDate" value={scheduleDate} />
                        <input type="hidden" name="scheduleTime" value={scheduleTime} />
                        <DraftActionButton
                          idle={t.schedule}
                          pending={t.scheduling}
                          icon={<Calendar className="h-[18px] w-[18px]" strokeWidth={2.5} />}
                          disabled={!canSubmitComposer || !canSchedule}
                          className={`mt-5 flex w-full rounded-xl px-4 py-3.5 text-[14px] font-bold shadow-sm ${
                            canSubmitComposer && canSchedule
                              ? "bg-[#1e2330] text-white enabled:hover:bg-[#273146]"
                              : "bg-[#cbd5e1] text-slate-50"
                          }`}
                        />
                      </form>
                    ) : (
                      <form action={saveDraftPostsAction}>
                        <input type="hidden" name="connectedAccountIdsJson" value={selectedAccountIdsJson} />
                        <input type="hidden" name="workspaceId" value={activeWorkspace.id} />
                        <input type="hidden" name="postText" value={composerText} />
                        <input type="hidden" name="imageUrlsJson" value={JSON.stringify(composerImageUrls)} />
                        <input
                          type="hidden"
                          name="replyTextsJson"
                          value={JSON.stringify(normalizedComposerReplyTexts)}
                        />
                        <input type="hidden" name="timezone" value={browserTimezone} />
                        <DraftActionButton
                          idle={t.addToQueue}
                          pending={t.savingDrafts}
                          icon={<Copy className="h-[18px] w-[18px]" strokeWidth={2.5} />}
                          disabled={!canSubmitComposer}
                          className={`mt-5 flex w-full rounded-xl px-4 py-3.5 text-[14px] font-bold shadow-sm ${
                            canSubmitComposer
                              ? "bg-[#1e2330] text-white enabled:hover:bg-[#273146]"
                              : "bg-[#cbd5e1] text-slate-50"
                          }`}
                        />
                      </form>
                    )}

                    <form action={saveDraftPostsAction}>
                      <input type="hidden" name="connectedAccountIdsJson" value={selectedAccountIdsJson} />
                      <input type="hidden" name="workspaceId" value={activeWorkspace.id} />
                      <input type="hidden" name="postText" value={composerText} />
                      <input type="hidden" name="imageUrlsJson" value={JSON.stringify(composerImageUrls)} />
                      <input
                        type="hidden"
                        name="replyTextsJson"
                        value={JSON.stringify(normalizedComposerReplyTexts)}
                      />
                      <input type="hidden" name="timezone" value={browserTimezone} />
                      <DraftActionButton
                        idle={t.saveDrafts}
                        pending={t.savingDrafts}
                        icon={<Copy className="h-[18px] w-[18px]" />}
                        disabled={!canSubmitComposer}
                        className="mt-2 flex w-full rounded-xl px-4 py-2.5 text-[13px] font-semibold text-[#64748b] enabled:hover:bg-slate-50 enabled:hover:text-slate-800"
                      />
                    </form>
                  </div>
                )}
              </div>
            ) : (
              <form
                action={generateDraftsAction}
                onSubmit={(event) => {
                  const id = issueGenerationRequestId();
                  const form = event.currentTarget;
                  const hiddenInput = form.elements.namedItem(
                    "generationRequestId",
                  ) as HTMLInputElement | null;
                  if (hiddenInput) {
                    hiddenInput.value = id;
                  }
                  localStorage.setItem("hustle_draft_generating", id);
                  window.dispatchEvent(new Event("hustle_draft_started"));
                }}
                className="relative z-20 rounded-xl border border-[#e2e8f0] bg-white p-6 shadow-[0_4px_12px_rgba(0,0,0,0.03)] pointer-events-auto"
              >
                <input type="hidden" name="connectedAccountId" value={primarySelectedAccount?.id ?? ""} />
                <input type="hidden" name="workspaceId" value={activeWorkspace.id} />
                <input type="hidden" name="generationRequestId" value={generationRequestId} />
                <input type="hidden" name="locale" value={locale} />
                <input type="hidden" name="workspaceName" value={activeWorkspace.name} />
                <input type="hidden" name="keyword1" value={activeWorkspace.keywords[0] ?? ""} />
                <input type="hidden" name="keyword2" value={activeWorkspace.keywords[1] ?? ""} />
                <input type="hidden" name="keyword3" value={activeWorkspace.keywords[2] ?? ""} />
                <input type="hidden" name="targetAudience" value={activeWorkspace.customization.targetAudience} />
                <input type="hidden" name="productLink" value={activeWorkspace.customization.productLink} />
                <input type="hidden" name="commonInstruction" value={activeWorkspace.customization.commonInstruction} />
                <input type="hidden" name="informationalFocus" value={activeWorkspace.customization.informationalFocus} />
                <input type="hidden" name="engagementFocus" value={activeWorkspace.customization.engagementFocus} />
                <input type="hidden" name="productFocus" value={activeWorkspace.customization.productFocus} />
                <input type="hidden" name="draftCount" value={informationalCount + engagementCount + productCount} />

                <h3 className="text-[16px] font-bold text-[#1e2330]">
                  {t.aiModeTitle}
                </h3>

                <div className="mt-5 space-y-2">
                  <p className="text-[12px] leading-5 text-slate-400">
                    {selectedAccounts.length > 0
                      ? selectedAccountSummary
                      : locale === "ko"
                        ? "상단에서 계정을 선택하면, 이 워크스페이스 초안을 선택된 계정 전체에 발행할 수 있습니다."
                        : "Select accounts above. Drafts from this workspace can then be published to all selected accounts."}
                  </p>
                  {(
                    [
                      ["informational", informationalCount, setInformationalCount],
                      ["engagement", engagementCount, setEngagementCount],
                      ["product", productCount, setProductCount],
                    ] as const
                  ).map(([type, value, setValue]) => (
                    <div
                      key={type}
                      className="flex items-center justify-between rounded-xl bg-slate-50/50 px-3 py-3 border border-slate-100"
                    >
                      <span className="text-[13px] font-semibold text-slate-700">
                        {t.types[type]}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[12px] text-slate-500">
                          {formatCountByLocale(locale, value)}
                        </span>
                        <select
                          name={`${type}Count`}
                          value={String(value)}
                          onChange={(event) => setValue(Number(event.target.value))}
                          className="cursor-pointer rounded-lg border border-[#e2e8f0] bg-white px-2 py-1 text-xs font-semibold text-slate-700 outline-none shadow-sm"
                        >
                          {Array.from({ length: 11 }, (_, count) => count).map((count) => (
                            <option key={count} value={count}>
                              {count}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex flex-col gap-2">
                  <GenerateDraftActionButton
                    idle={t.generate}
                    className="w-full rounded-xl bg-[#20c997] py-3 text-[#1e2330] hover:bg-[#1db386] shadow-sm text-[14px]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const firstDraft = Object.values(groupedDrafts)
                        .flat()
                        .find(Boolean);
                      if (firstDraft) {
                        handleUseDraft(firstDraft);
                      }
                    }}
                    className="w-full cursor-pointer rounded-xl border border-[#e2e8f0] px-4 py-3 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    {t.useDraft}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-3">
        {(
          [
            ["informational", groupedDrafts.informational],
            ["engagement", groupedDrafts.engagement],
            ["product", groupedDrafts.product],
          ] as const
        ).map(([type, draftsForType]) => (
          <div key={type} className="space-y-3">
            <div className="flex items-center justify-between px-2 mb-2">
              <div>
                <p className="text-[14px] font-bold text-[#1e2330]">
                  {t.types[type]}
                </p>
                <p className="text-[12px] font-medium text-slate-500">
                  {activeWorkspace.name}
                </p>
              </div>
            </div>

            <div className="relative h-[700px] overflow-hidden rounded-[36px] border-[5px] border-[#1e2330] bg-white shadow-sm">
              <div
                ref={(node) => {
                  scrollAreaRefs.current[type] = node;
                }}
                onScroll={() => updateScrollIndicator(type, true)}
                className="draft-scroll-area h-full overflow-y-auto divide-y divide-slate-200"
              >
                {draftsForType.length > 0 ? (
                  draftsForType.map((draft) => (
                    <ThreadsPreviewCard
                      key={draft.id}
                      locale={locale}
                      label={t.types[type]}
                      draft={draft}
                      draftText={getDraftText(draft)}
                      replyTexts={getDraftReplyTexts(draft)}
                      isEditing={editingDraftId === draft.id}
                      account={primarySelectedAccount}
                      accountLabel={
                        primarySelectedAccount
                          ? getConnectedAccountDisplayLabel(primarySelectedAccount)
                          : locale === "ko"
                            ? "계정을 선택하세요"
                            : "Select account"
                      }
                      extraSelectedAccountsCount={extraSelectedAccountsCount}
                      selected={selectedDraft?.id === draft.id}
                      onUse={handleUseDraft}
                      onDraftTextChange={handleDraftTextChange}
                      onDraftReplyTextChange={handleDraftReplyTextChange}
                      onOpenPublish={(draftToPublish) => {
                        setSelectedDraftId(draftToPublish.id);
                        setEditingDraftId(draftToPublish.id);
                        setComposerText(getDraftText(draftToPublish));
                        setComposerReplyTexts(getDraftReplyTexts(draftToPublish));
                        setPublishModalDraftId(draftToPublish.id);
                      }}
                      relativeBaseIso={renderedAt}
                    />
                  ))
                ) : (
                  <ThreadsPreviewCard
                    locale={locale}
                    label={t.types[type]}
                    draft={undefined}
                    draftText=""
                    replyTexts={[]}
                    isEditing={false}
                    account={primarySelectedAccount}
                    accountLabel={
                      primarySelectedAccount
                        ? getConnectedAccountDisplayLabel(primarySelectedAccount)
                        : locale === "ko"
                          ? "계정을 선택하세요"
                          : "Select account"
                    }
                    extraSelectedAccountsCount={extraSelectedAccountsCount}
                    selected={false}
                    onUse={handleUseDraft}
                    onDraftTextChange={handleDraftTextChange}
                    onDraftReplyTextChange={handleDraftReplyTextChange}
                    onOpenPublish={() => {}}
                    relativeBaseIso={renderedAt}
                  />
                )}
              </div>
              {scrollIndicators[type].canScroll ? (
                <div className="pointer-events-none absolute inset-y-3 right-[6px] w-[10px]">
                  <div
                    className={`absolute right-0 w-[10px] rounded-full bg-slate-300/90 transition-opacity duration-200 ${
                      scrollIndicators[type].visible ? "opacity-100" : "opacity-0"
                    }`}
                    style={{
                      top: `${scrollIndicators[type].thumbTop}px`,
                      height: `${scrollIndicators[type].thumbHeight}px`,
                    }}
                  />
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {filteredDrafts.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center text-sm text-slate-500">
          {activeWorkspace.keywords.length === 0 ? t.noKeywords : t.noDrafts}
        </div>
      ) : null}

      {publishModalDraft ? (
        <DraftPublishModal
          locale={locale}
          draft={publishModalDraft}
          workspaceId={activeWorkspace.id}
          postText={getDraftText(publishModalDraft)}
          connectedAccountIdsJson={selectedAccountIdsJson}
          replyTexts={getDraftReplyTexts(publishModalDraft)}
          selectedAccountSummary={selectedAccountSummary}
          timezone={browserTimezone}
          scheduleDate={draftScheduleDate}
          scheduleTime={draftScheduleTime}
          onScheduleDateChange={setDraftScheduleDate}
          onScheduleTimeChange={setDraftScheduleTime}
          onClose={() => {
            setPublishModalDraftId(null);
            setDraftScheduleDate("");
            setDraftScheduleTime("");
          }}
          publishDraftNowAction={publishDraftNowAction}
          scheduleGeneratedDraftAction={scheduleGeneratedDraftAction}
        />
      ) : null}
    </div>
  );
}
