"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Plus, X } from "lucide-react";
import type { DashboardCopy } from "@/lib/i18n/dashboard";
import type { Locale } from "@/lib/i18n/locales";
import type {
  QueueAiType,
  QueueSourceMode,
} from "@/app/dashboard/queue-actions";
import { ConnectedAccountAvatar } from "@/components/connected-account-avatar";

function formatLocalizedTime(timeStr: string, locale: Locale | string): string {
  try {
    const [h, m] = timeStr.split(":");
    const d = new Date();
    d.setHours(Number(h), Number(m));
    return new Intl.DateTimeFormat(locale, { timeStyle: "short" }).format(d);
  } catch {
    return timeStr;
  }
}

function formatCustomAMPM(timeStr: string) {
  try {
    const [hRaw, m] = timeStr.split(":");
    const h = Number(hRaw);
    const suffix = h >= 12 ? "PM" : "AM";
    const hours12 = h % 12 || 12;
    return `${suffix} ${String(hours12).padStart(2, "0")}:${m}`;
  } catch {
    return timeStr;
  }
}

type QueueSlotInput = {
  id: string;
  time: string;
  enabled: boolean;
  days: boolean[];
  sourceMode: QueueSourceMode;
  aiType: QueueAiType;
  connectedAccountIds?: string[];
};

type QueueSettingsInput = {
  timezone: string;
  sourceMode: QueueSourceMode;
  aiType: QueueAiType;
  randomizePostingTime: boolean;
  slots: QueueSlotInput[];
};

type QueueSlotState = Omit<QueueSlotInput, "connectedAccountIds"> & {
  connectedAccountIds: string[];
};

type QueueSettingsState = Omit<QueueSettingsInput, "slots"> & {
  slots: QueueSlotState[];
};

type QueueScheduleEditorProps = {
  copy: DashboardCopy["pages"]["settings"]["queue"];
  locale: Locale;
  workspaceId: string;
  workspaceName: string;
  initialSettings: QueueSettingsInput;
  availableAccounts: Array<{
    id: string;
    platform_user_id: string;
    username: string | null;
    display_name: string | null;
    avatar_url?: string | null;
  }>;
  saveAction: (formData: FormData) => Promise<void>;
  redirectTo: string;
};

const DEFAULT_WEEKDAYS: boolean[] = [true, true, true, true, true, false, false];

function SubmitButton({
  copy,
}: {
  copy: DashboardCopy["pages"]["settings"]["queue"];
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? copy.saving : copy.save}
    </button>
  );
}

function createSlot(
  time: string,
  days = DEFAULT_WEEKDAYS,
  enabled = true,
  connectedAccountIds: string[] = [],
  sourceMode: QueueSourceMode = "ai_type",
  aiType: QueueAiType = "informational",
): QueueSlotState {
  const normalizedDays = [
    ...days,
    ...Array.from({ length: Math.max(0, 7 - days.length) }, () => false),
  ].slice(0, 7);

  return {
    id: globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    time,
    enabled,
    days: normalizedDays,
    connectedAccountIds,
    sourceMode,
    aiType,
  };
}

function normalizeSettings(
  settings: QueueSettingsInput,
  availableAccountIds: string[],
): QueueSettingsState {
  const normalizeSlotAccountIds = (connectedAccountIds: string[]) => {
    const allowed = connectedAccountIds.filter((id) => availableAccountIds.includes(id));
    if (availableAccountIds.length === 0) {
      return [] as string[];
    }

    return allowed.length > 0 ? allowed : availableAccountIds;
  };

  return {
    ...settings,
    slots:
      settings.slots.length > 0
        ? settings.slots.map((slot) => ({
            ...slot,
            days: Array.from({ length: 7 }, (_, index) => Boolean(slot.days[index])),
            connectedAccountIds: normalizeSlotAccountIds(slot.connectedAccountIds ?? []),
            sourceMode:
              slot.sourceMode === "ai_random" || slot.sourceMode === "draft_random"
                ? slot.sourceMode
                : "ai_type",
            aiType:
              slot.aiType === "engagement" || slot.aiType === "product"
                ? slot.aiType
                : "informational",
          }))
        : [
            createSlot("11:00", DEFAULT_WEEKDAYS, true, availableAccountIds),
            createSlot("16:00", DEFAULT_WEEKDAYS, true, availableAccountIds),
          ],
  };
}

function nextTimeValue(time: string) {
  const [hourRaw, minuteRaw] = time.split(":");
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return "12:00";
  }

  const nextHour = (hour + 2) % 24;
  return `${String(nextHour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function getAiTypeLabel(type: QueueAiType, copy: DashboardCopy["pages"]["settings"]["queue"]) {
  if (type === "engagement") {
    return copy.engagement;
  }

  if (type === "product") {
    return copy.product;
  }

  return copy.informational;
}

function getSourceModeLabel(
  mode: QueueSourceMode,
  aiType: QueueAiType,
  copy: DashboardCopy["pages"]["settings"]["queue"],
) {
  if (mode === "ai_type") {
    return getAiTypeLabel(aiType, copy);
  }

  if (mode === "ai_random") {
    return copy.aiRandom;
  }

  return copy.draftRandom;
}

function getAccountLabel(account: {
  username: string | null;
  display_name: string | null;
}) {
  if (account.username && account.username.trim()) {
    return `@${account.username.trim()}`;
  }

  if (account.display_name && account.display_name.trim()) {
    return account.display_name.trim();
  }

  return "@threads";
}

function getSlotAccountsSummary(input: {
  connectedAccountIds: string[];
  availableAccounts: QueueScheduleEditorProps["availableAccounts"];
  copy: DashboardCopy["pages"]["settings"]["queue"];
}) {
  const selected = input.availableAccounts.filter((account) =>
    input.connectedAccountIds.includes(account.id),
  );

  if (selected.length === 0) {
    return input.copy.accountsNone;
  }

  if (selected.length === input.availableAccounts.length) {
    return input.copy.accountsAll;
  }

  return `${selected.length} ${input.copy.accountsSelected}`;
}

export function QueueScheduleEditor({
  copy,
  locale,
  workspaceId,
  workspaceName,
  initialSettings,
  availableAccounts,
  saveAction,
  redirectTo,
}: QueueScheduleEditorProps) {
  const availableAccountIds = availableAccounts.map((account) => account.id);
  const normalizedInitial = normalizeSettings(initialSettings, availableAccountIds);
  const [settings, setSettings] = useState<QueueSettingsState>(() => normalizedInitial);
  const [selectedSlotId, setSelectedSlotId] = useState<string>(
    () => normalizedInitial.slots[0]?.id ?? "",
  );

  const serializedSettings = JSON.stringify(settings);
  const selectedSlot =
    settings.slots.find((slot) => slot.id === selectedSlotId) ?? settings.slots[0] ?? null;

  const updateSlot = (
    slotId: string,
    updater: (slot: QueueSlotState) => QueueSlotState,
  ) => {
    setSettings((current) => ({
      ...current,
      slots: current.slots.map((slot) => (slot.id === slotId ? updater(slot) : slot)),
    }));
  };

  const addSlot = () => {
    setSettings((current) => ({
      ...current,
      slots: [
        ...current.slots,
        createSlot(
          nextTimeValue(current.slots.at(-1)?.time ?? "11:00"),
          DEFAULT_WEEKDAYS,
          true,
          selectedSlot?.connectedAccountIds?.length
            ? selectedSlot.connectedAccountIds
            : availableAccountIds,
          selectedSlot?.sourceMode ?? "ai_type",
          selectedSlot?.aiType ?? "informational",
        ),
      ],
    }));
  };

  const removeSlot = (slotId: string) => {
    if (settings.slots.length <= 1) {
      return;
    }

    const nextSlots = settings.slots.filter((slot) => slot.id !== slotId);
    setSettings((current) => ({
      ...current,
      slots: nextSlots,
    }));

    if (selectedSlotId === slotId) {
      setSelectedSlotId(nextSlots[0]?.id ?? "");
    }
  };

  return (
    <form action={saveAction} className="space-y-8">
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <input type="hidden" name="queueSettings" value={serializedSettings} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px] items-start">
        {/* Left Panel: Queue Schedule */}
        <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm flex flex-col min-h-0">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-[20px] font-bold text-slate-900 tracking-tight">
                {copy.title}
              </h2>
              <p className="mt-1 text-[13px] text-slate-500 leading-relaxed truncate">
                {copy.description}
              </p>
            </div>
            <div className="shrink-0 flex items-center justify-center rounded-full border border-slate-200 bg-slate-50/80 px-4 py-1.5 text-xs font-bold text-slate-600 shadow-sm">
              {workspaceName}
            </div>
          </div>

          <div className="mb-6 flex flex-col sm:flex-row gap-4 w-full">
            <label className="flex-1 space-y-1.5 min-w-0">
              <span className="text-[12px] font-bold text-slate-500 uppercase tracking-widest pl-1">
                {copy.timezone}
              </span>
              <input
                value={settings.timezone}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    timezone: event.target.value,
                  }))
                }
                className="w-full rounded-[14px] border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] font-medium text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-1 focus:ring-emerald-400"
              />
            </label>

            <div className="flex-1 rounded-[14px] border border-slate-200 bg-white p-3 min-w-0 flex items-center justify-between shadow-sm">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">
                  {copy.active}
                </div>
                <div className="mt-0.5 text-[15px] font-extrabold text-slate-900 px-1 flex items-baseline gap-1.5">
                  <span className="text-emerald-500 text-lg leading-none">{settings.slots.filter(s => s.enabled).length}</span>
                  <span className="text-[13px]">{locale === "ko" ? "개 활성" : `active slot${settings.slots.filter(s => s.enabled).length === 1 ? "" : "s"}`}</span>
                </div>
              </div>
              <div className="h-8 w-px bg-slate-100" />
              <div className="text-right flex flex-col items-end">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1">
                  {copy.timeLabel}
                </div>
                <div className="mt-0.5 text-[14px] font-extrabold text-slate-800 px-1">
                  {settings.slots.length} {locale === "ko" ? "행" : `row${settings.slots.length === 1 ? "" : "s"}`}
                </div>
              </div>
            </div>
          </div>

          {/* Slots List */}
          <div className="flex flex-col gap-3">
             <div className="hidden sm:flex items-center justify-between gap-[22px] px-4 pb-2 text-[12px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 mb-2">
                <div className="flex items-center gap-[22px] flex-1">
                  <div className="w-[140px] shrink-0 pl-1">{copy.timeLabel}</div>
                  <div className="flex items-center gap-1.5 w-[280px] shrink-0 justify-between">
                     {copy.weekdaysShort.map((day: string) => (
                       <div key={day} className="w-[38px] text-center shrink-0">{day}</div>
                     ))}
                  </div>
                </div>
                <div className="pr-[48px] shrink-0">{copy.sourceMode}</div>
             </div>

            {settings.slots.map((slot) => {
              const isActive = selectedSlot?.id === slot.id;
              
              return (
                <div
                  key={slot.id}
                  onClick={() => setSelectedSlotId(slot.id)}
                  className={`group relative flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 rounded-3xl p-3 sm:p-4 transition-all cursor-pointer border bg-white ${
                    isActive
                      ? "border-emerald-400 shadow-[0_8px_30px_rgba(16,185,129,0.12)] ring-1 ring-emerald-500 z-10"
                      : slot.enabled
                        ? "border-slate-200 hover:border-slate-300 hover:shadow-[0_8px_20px_-8px_rgba(0,0,0,0.06)]"
                        : "border-slate-100 bg-slate-50/50 opacity-60 hover:opacity-100"
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-[22px] w-full sm:flex-1 relative z-10 min-w-0">
                    {/* Time Input via Fake Overlay Overlaying Native Input */}
                    <div className="relative w-[140px] h-[48px] shrink-0">
                      <div className={`absolute inset-0 flex items-center justify-between pl-4 pr-3.5 rounded-[20px] transition-all border ${
                        isActive 
                           ? "border-emerald-300 bg-emerald-50/40 shadow-sm" 
                           : slot.enabled 
                              ? "border-slate-200 bg-white" 
                              : "border-slate-100 bg-slate-50"
                      } pointer-events-none`}>
                         <span className={`font-bold text-[17px] tracking-tight ${isActive ? "text-emerald-900" : "text-slate-800"}`}>
                           {formatCustomAMPM(slot.time)}
                         </span>
                         <svg className={`w-4 h-4 ${isActive ? "text-emerald-500" : "text-slate-400"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                         </svg>
                      </div>
                      <input
                        type="time"
                        step={300}
                        value={slot.time}
                        onChange={(e) =>
                          updateSlot(slot.id, (current) => ({
                            ...current,
                            time: e.target.value,
                          }))
                        }
                        onClick={(e) => e.stopPropagation()}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer text-[16px]"
                      />
                    </div>

                    {/* Weekdays - Enforce rigid circles */}
                    <div className="flex items-center gap-1 sm:gap-1.5 w-[280px] shrink-0 justify-between sm:justify-start">
                      {slot.days.map((dayEnabled, dayIndex) => (
                        <button
                          key={`${slot.id}-${dayIndex}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            updateSlot(slot.id, (current) => ({
                              ...current,
                              days: current.days.map((dayValue, index) =>
                                index === dayIndex ? !dayValue : dayValue,
                              ),
                            }));
                          }}
                          className={`flex aspect-square shrink-0 w-9 sm:w-[38px] items-center justify-center rounded-full transition-all border ${
                            dayEnabled
                              ? "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/20 font-bold"
                              : "bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600 font-medium"
                          } text-[13px] sm:text-[14px]`}
                        >
                           {dayEnabled ? "✓" : copy.weekdaysShort[dayIndex]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Right side: Source Mode Info and Delete Button */}
                  <div className={`flex items-center justify-between sm:justify-end w-full sm:w-auto mt-3 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-t-0 shrink-0 ${isActive ? "border-emerald-100" : "border-slate-100"}`}>
                    <div className="flex flex-col items-start sm:items-end justify-center leading-tight">
                       <span className={`text-[13px] font-bold ${isActive ? "text-emerald-900" : "text-slate-800"}`}>
                         {getSourceModeLabel(slot.sourceMode, slot.aiType, copy)}
                       </span>
                       <span className={`text-[11px] font-medium truncate max-w-[140px] mt-1 px-2.5 py-1 rounded-[10px] border ${isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200/50" : "bg-slate-50 border-slate-200 text-slate-500"}`}>
                         {getSlotAccountsSummary({
                           connectedAccountIds: slot.connectedAccountIds,
                           availableAccounts,
                           copy,
                         })}
                       </span>
                    </div>

                    <div className="flex items-center pl-2 sm:pl-4">
                       <button
                         type="button"
                         onClick={(e) => {
                           e.stopPropagation();
                           removeSlot(slot.id);
                         }}
                         disabled={settings.slots.length <= 1}
                         className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-30 ${isActive ? "bg-emerald-50 text-emerald-600 hover:bg-rose-100 hover:text-rose-600" : "bg-slate-100 text-slate-400 hover:bg-rose-100 hover:text-rose-600"}`}
                         aria-label={copy.removeTime}
                       >
                         <X className="h-4 w-4" />
                       </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={addSlot}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border-[2px] border-dashed border-emerald-300 bg-emerald-50/40 py-3.5 text-[15px] font-bold text-emerald-600 transition-all hover:border-emerald-400 hover:bg-emerald-50 shadow-sm hover:shadow-md"
          >
            <Plus className="h-5 w-5" />
            {copy.addTime}
          </button>
        </section>

        {/* Right Panel: Source Mode Editor */}
        <aside className="space-y-6">
          <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm sticky top-24">
            <div className="mb-6 flex flex-col border-b border-slate-100 pb-5">
              <div className="flex items-center justify-between">
                <h3 className="text-[18px] font-bold text-slate-900 tracking-tight">
                  {copy.sourceMode}
                </h3>
                
                {selectedSlot && (
                  <button
                    type="button"
                    onClick={() => {
                      updateSlot(selectedSlot.id, (current) => ({
                        ...current,
                        enabled: !current.enabled,
                      }));
                    }}
                    className={`relative flex h-[34px] w-[60px] shrink-0 items-center rounded-full transition-colors border shadow-inner ${
                      selectedSlot.enabled 
                         ? "bg-emerald-500 border-emerald-600" 
                         : "bg-slate-200 border-slate-300"
                    }`}
                    aria-label={selectedSlot.enabled ? copy.inactive : copy.active}
                  >
                    <span
                      className={`absolute h-[26px] w-[26px] rounded-full bg-white shadow-sm transition-transform duration-300 flex items-center justify-center ${
                        selectedSlot.enabled ? "translate-x-[30px]" : "translate-x-[4px]"
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${selectedSlot.enabled ? "bg-emerald-500" : "bg-slate-300"}`} />
                    </span>
                  </button>
                )}
              </div>
              
              <p className="mt-2 text-[13px] text-slate-500 leading-relaxed font-medium">
                {selectedSlot
                  ? <span className="inline-flex items-center text-emerald-900 font-bold bg-emerald-100/50 px-3 py-1.5 rounded-xl border border-emerald-200/70 shadow-[0_2px_10px_-2px_rgba(16,185,129,0.1)] select-none">
                      {formatCustomAMPM(selectedSlot.time)}
                    </span>
                  : copy.description}
                {selectedSlot && <span className="ml-2 text-slate-600">· {getSourceModeLabel(selectedSlot.sourceMode, selectedSlot.aiType, copy)}</span>}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6">
              {(
                [
                  { value: "ai_type", label: copy.aiType },
                  { value: "ai_random", label: copy.aiRandom },
                  { value: "draft_random", label: copy.draftRandom },
                ] as Array<{ value: QueueSourceMode; label: string }>
              ).map((mode) => {
                const active = selectedSlot?.sourceMode === mode.value;
                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => {
                      if (!selectedSlot) return;
                      updateSlot(selectedSlot.id, (current) => ({
                        ...current,
                        sourceMode: mode.value,
                      }));
                    }}
                    className={`rounded-xl border py-2.5 px-2 text-center transition-all ${
                      active
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm font-bold"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 font-medium hover:border-slate-300"
                    }`}
                  >
                    <div className="text-[12px]">{mode.label}</div>
                  </button>
                );
              })}
            </div>

            {selectedSlot?.sourceMode === "ai_type" && (
              <div className="mb-6 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="mb-2 text-[12px] font-bold text-slate-500 uppercase tracking-widest pl-1">
                  {copy.aiType}
                </div>
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-2xl">
                  {(
                    [
                      { value: "informational", label: copy.informational },
                      { value: "engagement", label: copy.engagement },
                      { value: "product", label: copy.product },
                    ] as Array<{ value: QueueAiType; label: string }>
                  ).map((type) => {
                    const active = selectedSlot?.aiType === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => {
                          if (!selectedSlot) return;
                          updateSlot(selectedSlot.id, (current) => ({
                            ...current,
                            aiType: type.value,
                          }));
                        }}
                        className={`rounded-xl py-2 px-2 text-[12px] font-bold transition-all ${
                          active
                            ? "bg-slate-900 text-white shadow-md scale-100"
                            : "bg-transparent text-slate-600 hover:bg-slate-200/50 scale-95 hover:scale-100"
                        }`}
                      >
                        {type.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mb-6">
              <div className="mb-2 flex items-center justify-between pl-1 pr-2">
                <span className="text-[12px] font-bold text-slate-500 uppercase tracking-widest">
                  {copy.accounts}
                </span>
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                   {selectedSlot?.connectedAccountIds?.length || 0} / {availableAccounts.length}
                </span>
              </div>

              {availableAccounts.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-[13px] text-slate-500 font-medium">
                  {copy.noConnectedAccounts}
                </div>
              ) : (
                <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                  {availableAccounts.map((account) => {
                    const selected =
                      selectedSlot?.connectedAccountIds.includes(account.id) ?? false;

                    return (
                      <button
                        key={account.id}
                        type="button"
                        onClick={() => {
                          if (!selectedSlot) return;
                          updateSlot(selectedSlot.id, (current) => {
                            const hasId = current.connectedAccountIds.includes(account.id);
                            const nextAccountIds = hasId
                              ? current.connectedAccountIds.filter((id) => id !== account.id)
                              : [...current.connectedAccountIds, account.id];

                            if (nextAccountIds.length === 0) {
                              return current;
                            }

                            return {
                              ...current,
                              connectedAccountIds: nextAccountIds,
                            };
                          });
                        }}
                        className={`group flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all ${
                          selected
                            ? "border-emerald-500 bg-emerald-50 shadow-[0_2px_8px_rgba(16,185,129,0.1)]"
                            : "border-slate-200 bg-white hover:border-emerald-200 hover:bg-emerald-50/30"
                        }`}
                      >
                        <ConnectedAccountAvatar
                          account={{
                            platform: "threads",
                            platform_user_id: account.platform_user_id,
                            username: account.username,
                            display_name: account.display_name,
                            avatar_url: account.avatar_url ?? null,
                          }}
                          size={32}
                          showPlatformBadge={false}
                          className="shrink-0"
                          initialsClassName="text-[12px]"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-bold text-slate-900 leading-tight">
                            {getAccountLabel(account)}
                          </div>
                          {account.display_name && (
                            <div className="truncate text-[11px] font-medium text-slate-500 mt-0.5">
                              {account.display_name}
                            </div>
                          )}
                        </div>
                        <div className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all ${
                          selected 
                            ? "bg-emerald-500 border-emerald-500 text-white" 
                            : "bg-slate-100 border-slate-200 text-transparent group-hover:bg-emerald-100"
                        }`}>
                          <svg viewBox="0 0 14 14" fill="none" className="w-3.5 h-3.5"><path d="M11.666 3.5L5.249 9.917L2.333 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition-all hover:bg-slate-100/80 cursor-pointer" onClick={() => setSettings(c => ({...c, randomizePostingTime: !c.randomizePostingTime}))}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="text-[13px] font-bold text-slate-900">
                    {copy.randomizePostingTime}
                  </div>
                  <p className="mt-1 text-[12px] font-medium leading-relaxed text-slate-500 pr-2">
                    {copy.randomizeDescription}
                  </p>
                </div>
                <div
                  className={`relative flex h-6 w-10 shrink-0 items-center justify-center rounded-full transition-colors mt-0.5 ${
                    settings.randomizePostingTime ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                      settings.randomizePostingTime ? "translate-x-2" : "-translate-x-2"
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <SubmitButton copy={copy} />
            </div>
          </section>
        </aside>
      </div>
    </form>
  );
}
