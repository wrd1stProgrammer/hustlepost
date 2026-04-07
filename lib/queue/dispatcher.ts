import "server-only";

import { publishScheduledPost } from "@/lib/publishing/scheduled";
import { generateQueueDrafts } from "@/lib/queue/auto-generate";
import {
  createQueueDispatchRun,
  createQueueScheduledPost,
  finalizeQueueDispatchRun,
  listActiveWorkspaceQueueSettings,
  listActiveThreadsAccountsForUser,
  pickEligibleDraftCandidate,
  pickEligibleGeneratedHookCandidate,
} from "@/lib/db/queue";
import type {
  QueueAiDraftType,
  QueueDispatchSummary,
  QueueGeneratedHookCandidate,
  QueueSourceMode,
  QueueWeekday,
  WorkspaceQueueSettingsWithSlotsRecord,
} from "@/lib/types/queue";

type QueueClock = {
  localDate: string;
  weekday: QueueWeekday;
  slotTime: string;
};

type QueueSlotMatch = {
  clock: QueueClock;
  matchingSlot: WorkspaceQueueSettingsWithSlotsRecord["slots"][number];
  effectiveSlotTime: string;
  randomOffsetMinutes: number;
};

type ResolvedGeneratedHook = {
  selectedHook: QueueGeneratedHookCandidate | null;
  attemptedDraftTypes: QueueAiDraftType[];
  generationTriggered: boolean;
  generatedDraftCount: number;
};

type QueueDispatchOutcome = {
  summary: QueueDispatchSummary;
  runs: Array<{ dispatchRunId: string; status: "success" | "skipped" | "failed" }>;
};

const AI_DRAFT_TYPES: QueueAiDraftType[] = [
  "informational",
  "engagement",
  "product",
];

const EMPTY_SUMMARY: QueueDispatchSummary = {
  settingsMatched: 0,
  slotsMatched: 0,
  dispatchRunsCreated: 0,
  duplicateDispatchRuns: 0,
  generatedRuns: 0,
  draftRuns: 0,
  scheduledPostsCreated: 0,
  publishedPosts: 0,
  failedPosts: 0,
  skippedRuns: 0,
  skippedNoActiveThreadsAccounts: 0,
  skippedNoEligibleCandidate: 0,
};

function createEmptySummary(): QueueDispatchSummary {
  return { ...EMPTY_SUMMARY };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getQueueClock(timezone: string, now: Date): QueueClock {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const extracted = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekdayMap: Record<string, QueueWeekday> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  const weekday = weekdayMap[extracted.weekday ?? ""];
  if (weekday === undefined) {
    throw new Error(`Unable to resolve weekday for timezone ${timezone}`);
  }

  const localDate =
    typeof extracted.year === "string" &&
    typeof extracted.month === "string" &&
    typeof extracted.day === "string"
      ? `${extracted.year}-${extracted.month}-${extracted.day}`
      : null;

  const slotTime =
    typeof extracted.hour === "string" && typeof extracted.minute === "string"
      ? `${extracted.hour}:${extracted.minute}`
      : null;

  if (!localDate || !slotTime) {
    throw new Error(`Unable to resolve queue clock for timezone ${timezone}`);
  }

  return {
    localDate,
    weekday,
    slotTime,
  };
}

function normalizeSlotTime(slotTime: string) {
  return slotTime.trim().slice(0, 5);
}

function parseSlotMinutes(slotTime: string) {
  const [hours, minutes] = normalizeSlotTime(slotTime).split(":");
  const parsedHours = Number(hours);
  const parsedMinutes = Number(minutes);

  if (
    !Number.isFinite(parsedHours) ||
    !Number.isFinite(parsedMinutes) ||
    parsedHours < 0 ||
    parsedHours > 23 ||
    parsedMinutes < 0 ||
    parsedMinutes > 59
  ) {
    return 0;
  }

  return parsedHours * 60 + parsedMinutes;
}

function formatSlotMinutes(totalMinutes: number) {
  const normalized = Math.min(Math.max(Math.trunc(totalMinutes), 0), 1439);
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function hashString(value: string) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return hash >>> 0;
}

function getDeterministicPostingOffsetMinutes(input: {
  workspaceId: string;
  slotId: string;
  localDate: string;
}) {
  const hash = hashString(`${input.workspaceId}:${input.slotId}:${input.localDate}`);
  const magnitude = 5 + (hash % 6);
  const direction = hash & 1 ? 1 : -1;

  return magnitude * direction;
}

function getEffectiveSlotTime(input: {
  randomizePostingTime: boolean;
  workspaceId: string;
  slotId: string;
  localDate: string;
  slotTime: string;
}) {
  const baseSlotTime = normalizeSlotTime(input.slotTime);
  if (!input.randomizePostingTime) {
    return {
      slotTime: baseSlotTime,
      offsetMinutes: 0,
    };
  }

  const baseMinutes = parseSlotMinutes(input.slotTime);
  let offsetMinutes = getDeterministicPostingOffsetMinutes({
    workspaceId: input.workspaceId,
    slotId: input.slotId,
    localDate: input.localDate,
  });

  const candidate = baseMinutes + offsetMinutes;
  if (candidate < 0 || candidate >= 1440) {
    offsetMinutes *= -1;
  }

  const adjustedMinutes = baseMinutes + offsetMinutes;

  return {
    slotTime: formatSlotMinutes(adjustedMinutes),
    offsetMinutes,
  };
}

function getMatchableSlots(settings: WorkspaceQueueSettingsWithSlotsRecord) {
  return settings.slots.filter((slot) => slot.isActive);
}

function getSlotConnectedAccountIds(
  slot: WorkspaceQueueSettingsWithSlotsRecord["slots"][number],
) {
  return (slot as WorkspaceQueueSettingsWithSlotsRecord["slots"][number] & {
    connectedAccountIds?: string[];
  }).connectedAccountIds ?? [];
}

function findMatchingSlot(
  settings: WorkspaceQueueSettingsWithSlotsRecord,
  now: Date,
): QueueSlotMatch | null {
  const clock = getQueueClock(settings.timezone, now);
  const matchingSlots = getMatchableSlots(settings).filter(
    (slot) => slot.weekday === clock.weekday,
  );

  for (const slot of matchingSlots) {
    const effective = getEffectiveSlotTime({
      randomizePostingTime: settings.randomizePostingTime,
      workspaceId: settings.workspaceId,
      slotId: slot.id,
      localDate: clock.localDate,
      slotTime: slot.slotTime,
    });

    if (effective.slotTime === clock.slotTime) {
      return {
        clock,
        matchingSlot: slot,
        effectiveSlotTime: effective.slotTime,
        randomOffsetMinutes: effective.offsetMinutes,
      };
    }
  }

  return null;
}

function getRandomizedDraftTypeOrder(seed: string) {
  const items = AI_DRAFT_TYPES.map((type) => ({
    type,
    score: hashString(`${seed}:${type}`),
  }));

  items.sort((left, right) => {
    if (left.score === right.score) {
      return left.type.localeCompare(right.type);
    }
    return left.score - right.score;
  });

  return items.map((item) => item.type);
}

async function pickGeneratedHookForType(input: {
  userId: string;
  workspaceId: string;
  aiDraftType: QueueAiDraftType;
}) {
  return pickEligibleGeneratedHookCandidate({
    userId: input.userId,
    workspaceId: input.workspaceId,
    sourceMode: "ai_type",
    aiDraftType: input.aiDraftType,
  });
}

async function resolveGeneratedHookCandidate(input: {
  dispatchRunId: string;
  userId: string;
  workspaceId: string;
  localDate: string;
  slotTime: string;
  sourceMode: QueueSourceMode;
  aiDraftType: QueueAiDraftType | null;
}): Promise<ResolvedGeneratedHook> {
  if (input.sourceMode === "ai_type") {
    if (!input.aiDraftType) {
      return {
        selectedHook: null,
        attemptedDraftTypes: [],
        generationTriggered: false,
        generatedDraftCount: 0,
      };
    }

    const initial = await pickGeneratedHookForType({
      userId: input.userId,
      workspaceId: input.workspaceId,
      aiDraftType: input.aiDraftType,
    });
    if (initial) {
      return {
        selectedHook: initial,
        attemptedDraftTypes: [input.aiDraftType],
        generationTriggered: false,
        generatedDraftCount: 0,
      };
    }

    let generatedDraftCount = 0;
    let generationTriggered = false;
    try {
      generationTriggered = true;
      const generation = await generateQueueDrafts({
        userId: input.userId,
        workspaceId: input.workspaceId,
        sourceMode: "ai_type",
        aiDraftType: input.aiDraftType,
      });
      generatedDraftCount = generation.generatedCount;
    } catch (error) {
      console.error("[queue-dispatch] ai_type queue generation failed", {
        dispatchRunId: input.dispatchRunId,
        workspaceId: input.workspaceId,
        aiDraftType: input.aiDraftType,
        message: error instanceof Error ? error.message : String(error),
      });
    }

    const retry = await pickGeneratedHookForType({
      userId: input.userId,
      workspaceId: input.workspaceId,
      aiDraftType: input.aiDraftType,
    });

    return {
      selectedHook: retry,
      attemptedDraftTypes: [input.aiDraftType],
      generationTriggered,
      generatedDraftCount,
    };
  }

  if (input.sourceMode !== "ai_random") {
    return {
      selectedHook: null,
      attemptedDraftTypes: [],
      generationTriggered: false,
      generatedDraftCount: 0,
    };
  }

  const initialOrder = getRandomizedDraftTypeOrder(
    `${input.dispatchRunId}:${input.localDate}:${input.slotTime}:initial`,
  );
  for (const draftType of initialOrder) {
    const candidate = await pickGeneratedHookForType({
      userId: input.userId,
      workspaceId: input.workspaceId,
      aiDraftType: draftType,
    });

    if (candidate) {
      return {
        selectedHook: candidate,
        attemptedDraftTypes: initialOrder,
        generationTriggered: false,
        generatedDraftCount: 0,
      };
    }
  }

  let generatedDraftCount = 0;
  let generationTriggered = false;
  try {
    generationTriggered = true;
    const generation = await generateQueueDrafts({
      userId: input.userId,
      workspaceId: input.workspaceId,
      sourceMode: "ai_random",
      aiDraftType: null,
    });
    generatedDraftCount = generation.generatedCount;
  } catch (error) {
    console.error("[queue-dispatch] ai_random queue generation failed", {
      dispatchRunId: input.dispatchRunId,
      workspaceId: input.workspaceId,
      message: error instanceof Error ? error.message : String(error),
    });
  }

  if (generatedDraftCount <= 0) {
    return {
      selectedHook: null,
      attemptedDraftTypes: initialOrder,
      generationTriggered,
      generatedDraftCount,
    };
  }

  const retryOrder = getRandomizedDraftTypeOrder(
    `${input.dispatchRunId}:${input.localDate}:${input.slotTime}:retry`,
  );
  for (const draftType of retryOrder) {
    const candidate = await pickGeneratedHookForType({
      userId: input.userId,
      workspaceId: input.workspaceId,
      aiDraftType: draftType,
    });

    if (candidate) {
      return {
        selectedHook: candidate,
        attemptedDraftTypes: [...initialOrder, ...retryOrder],
        generationTriggered,
        generatedDraftCount,
      };
    }
  }

  return {
    selectedHook: null,
    attemptedDraftTypes: [...initialOrder, ...retryOrder],
    generationTriggered,
    generatedDraftCount,
  };
}

async function finalizeSkippedRun(input: {
  dispatchRunId: string;
  reason: string;
  summary: QueueDispatchSummary;
}) {
  await finalizeQueueDispatchRun({
    dispatchRunId: input.dispatchRunId,
    status: "skipped",
    errorMessage: input.reason,
    summary: {
      ...input.summary,
      reason: input.reason,
    },
  });

  return "skipped" as const;
}

async function processGeneratedHookRun(input: {
  dispatchRunId: string;
  userId: string;
  workspaceId: string;
  timezone: string;
  localDate: string;
  weekday: QueueWeekday;
  slotTime: string;
  connectedAccountIds: string[];
  sourceMode: QueueSourceMode;
  aiDraftType: QueueAiDraftType | null;
  summary: QueueDispatchSummary;
}) {
  const activeAccounts = await listActiveThreadsAccountsForUser(input.userId);
  const scopedActiveAccounts =
    input.connectedAccountIds.length > 0
      ? activeAccounts.filter((account) =>
          input.connectedAccountIds.includes(account.id),
        )
      : activeAccounts;

  if (scopedActiveAccounts.length === 0) {
    input.summary.skippedNoActiveThreadsAccounts += 1;
    input.summary.skippedRuns += 1;
    return finalizeSkippedRun({
      dispatchRunId: input.dispatchRunId,
      reason:
        input.connectedAccountIds.length > 0
          ? "no_selected_threads_accounts_active"
          : "no_active_threads_accounts",
      summary: input.summary,
    });
  }

  const resolvedHook = await resolveGeneratedHookCandidate({
    dispatchRunId: input.dispatchRunId,
    userId: input.userId,
    workspaceId: input.workspaceId,
    localDate: input.localDate,
    slotTime: input.slotTime,
    sourceMode: input.sourceMode,
    aiDraftType: input.aiDraftType,
  });
  const selectedHook = resolvedHook.selectedHook;

  if (!selectedHook) {
    input.summary.skippedNoEligibleCandidate += 1;
    input.summary.skippedRuns += 1;
    return finalizeSkippedRun({
      dispatchRunId: input.dispatchRunId,
      reason: "no_eligible_generated_hook",
      summary: input.summary,
    });
  }

  input.summary.generatedRuns += 1;

  let publishedCount = 0;
  let failedCount = 0;

  for (const account of scopedActiveAccounts) {
    try {
      const scheduledPost = await createQueueScheduledPost({
        userId: input.userId,
        workspaceId: input.workspaceId,
        connectedAccountId: account.id,
        generatedHookId: selectedHook.hookId,
        postText: selectedHook.outputText,
        replyText: selectedHook.replyText,
        replyTexts: selectedHook.replyTexts.length > 0 ? selectedHook.replyTexts : null,
        imageUrls: null,
        scheduledFor: new Date().toISOString(),
        timezone: input.timezone,
        idempotencyKey: `queue:${input.workspaceId}:${input.localDate}:${input.slotTime}:${selectedHook.hookId}:${account.id}`,
      });

      input.summary.scheduledPostsCreated += 1;

      const publishResult = await publishScheduledPost({
        scheduledPostId: scheduledPost.id,
        platform: "threads",
      });

      void publishResult;
      publishedCount += 1;
      input.summary.publishedPosts += 1;
    } catch (error) {
      failedCount += 1;
      input.summary.failedPosts += 1;
      console.error("[queue-dispatch] generated hook publish failed", {
        dispatchRunId: input.dispatchRunId,
        accountId: account.id,
        hookId: selectedHook.hookId,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const status = publishedCount > 0 ? "success" : "failed";
  if (failedCount > 0 && publishedCount === 0) {
    input.summary.failedPosts += 0;
  }

  await finalizeQueueDispatchRun({
    dispatchRunId: input.dispatchRunId,
    status,
    errorMessage:
      publishedCount > 0
        ? failedCount > 0
          ? "partial_publish_failures"
          : null
        : "no_generated_posts_published",
    summary: {
      ...input.summary,
      selectedHookId: selectedHook.hookId,
      selectedDraftType: selectedHook.draftType,
      attemptedDraftTypes: resolvedHook.attemptedDraftTypes,
      generationTriggered: resolvedHook.generationTriggered,
      generatedDraftCount: resolvedHook.generatedDraftCount,
      activeAccountIds: scopedActiveAccounts.map((account) => account.id),
      publishedCount,
      failedCount,
    },
  });

  return publishedCount > 0 ? "success" : "failed";
}

async function processDraftRun(input: {
  dispatchRunId: string;
  userId: string;
  workspaceId: string;
  timezone: string;
  localDate: string;
  weekday: QueueWeekday;
  slotTime: string;
  connectedAccountIds: string[];
  summary: QueueDispatchSummary;
}) {
  const activeAccounts = await listActiveThreadsAccountsForUser(input.userId);
  const scopedActiveAccounts =
    input.connectedAccountIds.length > 0
      ? activeAccounts.filter((account) =>
          input.connectedAccountIds.includes(account.id),
        )
      : activeAccounts;

  if (scopedActiveAccounts.length === 0) {
    input.summary.skippedNoActiveThreadsAccounts += 1;
    input.summary.skippedRuns += 1;
    return finalizeSkippedRun({
      dispatchRunId: input.dispatchRunId,
      reason:
        input.connectedAccountIds.length > 0
          ? "no_selected_threads_accounts_active"
          : "no_active_threads_accounts",
      summary: input.summary,
    });
  }

  const selectedDraft = await pickEligibleDraftCandidate({
    userId: input.userId,
    workspaceId: input.workspaceId,
    activeConnectedAccountIds: scopedActiveAccounts.map((account) => account.id),
  });

  if (!selectedDraft) {
    input.summary.skippedNoEligibleCandidate += 1;
    input.summary.skippedRuns += 1;
    return finalizeSkippedRun({
      dispatchRunId: input.dispatchRunId,
      reason: "no_eligible_draft",
      summary: input.summary,
    });
  }

  input.summary.draftRuns += 1;

  try {
    const publishResult = await publishScheduledPost({
      scheduledPostId: selectedDraft.scheduledPostId,
      platform: "threads",
    });

    input.summary.publishedPosts += 1;

    await finalizeQueueDispatchRun({
      dispatchRunId: input.dispatchRunId,
      status: "success",
      errorMessage: null,
      summary: {
        ...input.summary,
        selectedDraftId: selectedDraft.scheduledPostId,
        selectedConnectedAccountId: selectedDraft.connectedAccountId,
        activeAccountIds: scopedActiveAccounts.map((account) => account.id),
        publishResult: isRecord(publishResult) ? publishResult : null,
      },
    });
    return "success" as const;
  } catch (error) {
    input.summary.failedPosts += 1;
    await finalizeQueueDispatchRun({
      dispatchRunId: input.dispatchRunId,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : String(error),
      summary: {
        ...input.summary,
        selectedDraftId: selectedDraft.scheduledPostId,
        selectedConnectedAccountId: selectedDraft.connectedAccountId,
        activeAccountIds: scopedActiveAccounts.map((account) => account.id),
      },
    });

    return "failed" as const;
  }
}

export async function runQueueDispatcher(now = new Date()): Promise<QueueDispatchOutcome> {
  const summary = createEmptySummary();
  const settings = await listActiveWorkspaceQueueSettings();
  const runs: QueueDispatchOutcome["runs"] = [];

  for (const setting of settings) {
    summary.settingsMatched += 1;

    const match = findMatchingSlot(setting, now);
    if (!match) {
      continue;
    }

    summary.slotsMatched += 1;

    const dispatchRun = await createQueueDispatchRun({
      workspaceId: setting.workspaceId,
      workspaceQueueSettingsId: setting.id,
      userId: setting.userId,
      sourceMode: match.matchingSlot.sourceMode,
      aiDraftType: match.matchingSlot.aiDraftType,
      timezone: setting.timezone,
      localDate: match.clock.localDate,
      weekday: match.clock.weekday,
      slotTime: match.matchingSlot.slotTime,
      summary: {
        sourceMode: match.matchingSlot.sourceMode,
        aiDraftType: match.matchingSlot.aiDraftType,
        connectedAccountIds: getSlotConnectedAccountIds(match.matchingSlot),
        timezone: setting.timezone,
        localDate: match.clock.localDate,
        weekday: match.clock.weekday,
        slotTime: match.matchingSlot.slotTime,
        effectiveSlotTime: match.effectiveSlotTime,
        randomOffsetMinutes: match.randomOffsetMinutes,
      },
    });

    if (!dispatchRun.inserted) {
      summary.duplicateDispatchRuns += 1;
      summary.skippedRuns += 1;
      if (dispatchRun.run) {
        runs.push({
          dispatchRunId: dispatchRun.run.id,
          status: dispatchRun.run.status === "failed" ? "failed" : "skipped",
        });
      }
      continue;
    }

    summary.dispatchRunsCreated += 1;

    if (match.matchingSlot.sourceMode === "draft_random") {
      const status = await processDraftRun({
        dispatchRunId: dispatchRun.run.id,
        userId: setting.userId,
        workspaceId: setting.workspaceId,
        timezone: setting.timezone,
        localDate: match.clock.localDate,
        weekday: match.clock.weekday,
        slotTime: match.matchingSlot.slotTime,
        connectedAccountIds: getSlotConnectedAccountIds(match.matchingSlot),
        summary,
      });
      runs.push({
        dispatchRunId: dispatchRun.run.id,
        status,
      });
      continue;
    }

    const status = await processGeneratedHookRun({
      dispatchRunId: dispatchRun.run.id,
      userId: setting.userId,
      workspaceId: setting.workspaceId,
      timezone: setting.timezone,
      localDate: match.clock.localDate,
      weekday: match.clock.weekday,
      slotTime: match.matchingSlot.slotTime,
      connectedAccountIds: getSlotConnectedAccountIds(match.matchingSlot),
      sourceMode: match.matchingSlot.sourceMode,
      aiDraftType: match.matchingSlot.aiDraftType,
      summary,
    });

    runs.push({
      dispatchRunId: dispatchRun.run.id,
      status,
    });
  }

  return {
    summary,
    runs,
  };
}
