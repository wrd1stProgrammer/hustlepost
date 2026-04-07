import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { QueueWeekday } from "@/lib/types/queue";
import {
  listWorkspaceQueueSettings,
  replaceWorkspaceQueueTimeSlots,
  upsertWorkspaceQueueSettings,
} from "@/lib/db/queue";
import { getActiveWorkspace, getWorkspaceState } from "@/lib/dashboard/workspaces";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export type QueueSourceMode = "ai_type" | "ai_random" | "draft_random";
export type QueueAiType = "informational" | "engagement" | "product";

export type QueueTimeSlot = {
  id: string;
  time: string;
  enabled: boolean;
  days: boolean[];
  sourceMode: QueueSourceMode;
  aiType: QueueAiType;
};

export type QueueSettings = {
  timezone: string;
  sourceMode: QueueSourceMode;
  aiType: QueueAiType;
  randomizePostingTime: boolean;
  slots: QueueTimeSlot[];
};

const DEFAULT_WEEKDAYS: boolean[] = [true, true, true, true, true, false, false];

function appendQueryParam(pathname: string, key: string, value: string) {
  const url = pathname.startsWith("http")
    ? new URL(pathname)
    : new URL(pathname, "http://localhost");

  url.searchParams.set(key, value);
  return `${url.pathname}${url.search}${url.hash}`;
}

function makeSlot(
  time: string,
  days = DEFAULT_WEEKDAYS,
  enabled = true,
  sourceMode: QueueSourceMode = "ai_type",
  aiType: QueueAiType = "informational",
): QueueTimeSlot {
  const normalizedDays = [
    ...days,
    ...Array.from({ length: Math.max(0, 7 - days.length) }, () => false),
  ].slice(0, 7);

  return {
    id: randomUUID(),
    time,
    enabled,
    days: normalizedDays,
    sourceMode,
    aiType,
  };
}

function normalizeTime(value: unknown, fallback = "09:00") {
  if (typeof value !== "string") return fallback;
  const match = value.trim().match(/^(\d{2}):(\d{2})$/);
  if (!match) return fallback;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return fallback;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return fallback;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function normalizeBoolArray(value: unknown) {
  const source = Array.isArray(value) ? value : [];
  return Array.from({ length: 7 }, (_, index) => Boolean(source[index]));
}

function normalizeSlot(raw: unknown, fallbackTime: string): QueueTimeSlot {
  if (!raw || typeof raw !== "object") {
    return makeSlot(fallbackTime);
  }

  const source = raw as Record<string, unknown>;
  const sourceMode = normalizeSourceMode(source.sourceMode);
  return {
    id: typeof source.id === "string" && source.id ? source.id : randomUUID(),
    time: normalizeTime(source.time, fallbackTime),
    enabled: source.enabled === undefined ? true : Boolean(source.enabled),
    days: normalizeBoolArray(source.days),
    sourceMode,
    aiType: normalizeAiType(source.aiType),
  };
}

function normalizeSourceMode(value: unknown): QueueSourceMode {
  if (value === "ai_random" || value === "draft_random") {
    return value;
  }

  return "ai_type";
}

function normalizeAiType(value: unknown): QueueAiType {
  if (value === "engagement" || value === "product") {
    return value;
  }

  return "informational";
}

export function getDefaultQueueSettings(): QueueSettings {
  return {
    timezone: "Asia/Seoul",
    sourceMode: "ai_type",
    aiType: "informational",
    randomizePostingTime: false,
    slots: [makeSlot("11:00"), makeSlot("16:00")],
  };
}

export function normalizeQueueSettings(raw: unknown): QueueSettings {
  if (!raw || typeof raw !== "object") {
    return getDefaultQueueSettings();
  }

  const source = raw as Record<string, unknown>;
  const defaults = getDefaultQueueSettings();
  const slotsRaw = Array.isArray(source.slots) ? source.slots : [];
  const slots =
    slotsRaw.length > 0
      ? slotsRaw
          .slice(0, 12)
          .map((slot, index) => normalizeSlot(slot, index === 0 ? "11:00" : "16:00"))
      : defaults.slots;

  return {
    timezone:
      typeof source.timezone === "string" && source.timezone.trim()
        ? source.timezone.trim()
        : defaults.timezone,
    sourceMode: normalizeSourceMode(source.sourceMode),
    aiType: normalizeAiType(source.aiType),
    randomizePostingTime:
      typeof source.randomizePostingTime === "boolean"
        ? source.randomizePostingTime
        : Boolean(source.randomizePostingTime),
    slots,
  };
}

async function assertWorkspaceOwnership(input: {
  userId: string;
  workspaceId: string;
}) {
  const workspaceState = await getWorkspaceState({
    userId: input.userId,
  });
  const workspace = getActiveWorkspace(workspaceState, input.workspaceId);
  if (!workspace || workspace.id !== input.workspaceId) {
    throw new Error("Workspace not found");
  }

  return workspace;
}

function mapDbSettingsToQueueSettings(raw: Awaited<ReturnType<typeof listWorkspaceQueueSettings>>[number]): QueueSettings {
  const groupedByTime = new Map<
    string,
    {
      days: boolean[];
      enabled: boolean;
      sourceMode: QueueSourceMode;
      aiType: QueueAiType;
    }
  >();

  for (const slot of raw.slots) {
    const existing =
      groupedByTime.get(slot.slotTime) ??
      ({
        days: Array.from({ length: 7 }, () => false),
        enabled: false,
        sourceMode: slot.sourceMode,
        aiType: slot.aiDraftType ?? "informational",
      } satisfies {
        days: boolean[];
        enabled: boolean;
        sourceMode: QueueSourceMode;
        aiType: QueueAiType;
      });

    existing.days[slot.weekday] = true;
    existing.enabled = existing.enabled || slot.isActive;
    if (slot.isActive) {
      existing.sourceMode = slot.sourceMode;
      existing.aiType = slot.aiDraftType ?? "informational";
    }

    groupedByTime.set(slot.slotTime, existing);
  }

  const slots = Array.from(groupedByTime.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([time, group]) => ({
      id: randomUUID(),
      time,
      enabled: group.enabled,
      days: group.days,
      sourceMode: group.sourceMode,
      aiType: group.aiType,
    }));

  return normalizeQueueSettings({
    timezone: raw.timezone,
    sourceMode: raw.sourceMode,
    aiType: raw.aiDraftType ?? "informational",
    randomizePostingTime: raw.randomizePostingTime,
    slots: slots.length > 0 ? slots : getDefaultQueueSettings().slots,
  });
}

function flattenSlotsForDb(slots: QueueTimeSlot[]) {
  const flattened = new Map<string, {
    weekday: QueueWeekday;
    slotTime: string;
    sourceMode: QueueSourceMode;
    aiDraftType: QueueAiType | null;
    isActive: boolean;
  }>();

  for (const slot of slots) {
    const normalizedTime = normalizeTime(slot.time, "09:00");

    for (let day = 0; day < 7; day += 1) {
      if (!slot.days[day]) continue;
      const weekday = day as QueueWeekday;
      const dedupeKey = `${weekday}:${normalizedTime}`;
      const existing = flattened.get(dedupeKey);
      flattened.set(dedupeKey, {
        weekday: day as QueueWeekday,
        slotTime: normalizedTime,
        sourceMode: slot.sourceMode,
        aiDraftType: slot.sourceMode === "ai_type" ? slot.aiType : null,
        isActive: existing ? existing.isActive || slot.enabled : slot.enabled,
      });
    }
  }

  return Array.from(flattened.values());
}

export async function getQueueSettingsForWorkspace(input: {
  userId: string;
  workspaceId: string;
}) {
  await assertWorkspaceOwnership(input);

  const allQueueSettings = await listWorkspaceQueueSettings(input.userId);
  const current = allQueueSettings.find((setting) => setting.workspaceId === input.workspaceId);
  if (!current) {
    return getDefaultQueueSettings();
  }

  return mapDbSettingsToQueueSettings(current);
}

export async function saveQueueSettingsAction(formData: FormData) {
  "use server";

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const workspaceId = String(formData.get("workspaceId") ?? "").trim();
  const redirectTo = String(formData.get("redirectTo") ?? "/dashboard/settings?tab=queue");
  const queueSettingsRaw = formData.get("queueSettings");

  if (!workspaceId) {
    redirect(appendQueryParam(redirectTo, "error", "queue_failed"));
  }

  try {
    const workspace = await assertWorkspaceOwnership({
      userId: user.id,
      workspaceId,
    });

    const nextSettings = normalizeQueueSettings(
      typeof queueSettingsRaw === "string"
        ? JSON.parse(queueSettingsRaw)
        : queueSettingsRaw
          ? JSON.parse(String(queueSettingsRaw))
          : null,
    );

    const normalizedSlots = flattenSlotsForDb(nextSettings.slots);
    const queueEnabled = normalizedSlots.some((slot) => slot.isActive);
    const representativeSlot =
      nextSettings.slots.find((slot) => slot.enabled) ??
      nextSettings.slots[0] ??
      null;

    const upserted = await upsertWorkspaceQueueSettings({
      userId: user.id,
      workspaceId: workspace.id,
      sourceMode: representativeSlot?.sourceMode ?? "ai_type",
      aiDraftType:
        (representativeSlot?.sourceMode ?? "ai_type") === "ai_type"
          ? representativeSlot?.aiType ?? "informational"
          : null,
      timezone: nextSettings.timezone,
      randomizePostingTime: nextSettings.randomizePostingTime,
      isActive: queueEnabled,
    });

    await replaceWorkspaceQueueTimeSlots({
      workspaceQueueSettingsId: upserted.id,
      slots: normalizedSlots,
    });
  } catch {
    redirect(appendQueryParam(redirectTo, "error", "queue_failed"));
  }

  revalidatePath("/dashboard/settings");
  redirect(appendQueryParam(redirectTo, "saved", "1"));
}
