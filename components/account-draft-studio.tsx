"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  Loader2,
  Heart,
  MessageCircle,
  Repeat,
  Send,
  Hash,
  CalendarClock,
  Settings2,
  Check,
  X,
} from "lucide-react";
import type { ConnectedAccountWithKeywords } from "@/lib/types/db";
import type { GeneratedHookRecord } from "@/lib/types/marketing";

type Locale = "en" | "ko";

type AccountDraftStudioProps = {
  locale: Locale;
  account: ConnectedAccountWithKeywords;
  drafts: GeneratedHookRecord[];
  generateDraftsAction: (formData: FormData) => Promise<void>;
  saveKeywordsAction: (formData: FormData) => Promise<void>;
  scheduleBulkAction: (formData: FormData) => Promise<void>;
  scheduleSingleAction: (formData: FormData) => Promise<void>;
};

const COPY = {
  en: {
    generate: "Generate",
    generating: "Generating...",
    countLabel: "Count",
    placeholder: "Write specific instructions for the AI...",
    saveKeywords: "Save",
    keywordPlaceholder: "Keyword",
    scheduleN: "Schedule selected",
    scheduleModalTitle: "Schedule Publish",
    startTime: "Start Date & Time",
    intervalHr: "Interval (Hours)",
    confirmSchedule: "Confirm schedule",
    success: "Success",
    aiCustomization: "AI Customization",
    manualWrite: "Manual Write",
  },
  ko: {
    generate: "생성하기",
    generating: "생성 중...",
    countLabel: "개수",
    placeholder: "AI에게 지시할 내용 (예: 정보성, 간결하게...)",
    saveKeywords: "저장",
    keywordPlaceholder: "키워드",
    scheduleN: "개 선택됨 - 예약하기",
    scheduleModalTitle: "예약 발행 설정",
    startTime: "시작 시간",
    intervalHr: "발행 간격 (시간)",
    confirmSchedule: "예약 확정",
    success: "성공",
    aiCustomization: "AI 커스터마이징",
    manualWrite: "직접 글쓰기",
  },
} as const;

function SubmitButton({ idle, pending, icon: Icon }: { idle: string; pending: string; icon: any }) {
  const { pending: isPending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={isPending}
      className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:opacity-50"
    >
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
      {isPending ? pending : idle}
    </button>
  );
}

function formatDraftText(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return value;
  
  const jsonMatch = trimmed.match(/\{[\s\S]*\}$/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]) as { hooks?: unknown };
      if (Array.isArray(parsed.hooks)) {
        return parsed.hooks.map((item) => (typeof item === "string" ? item.trim() : "")).filter(Boolean).join("\n\n");
      }
    } catch { /* fall through */ }
  }

  const arrayMatch = trimmed.match(/"hooks"\s*:\s*\[([\s\S]*?)\]/);
  if (arrayMatch) {
    const extracted = Array.from(arrayMatch[1].matchAll(/"((?:\\.|[^"\\])*)"/g)).map((match) => match[1]?.replace(/\\"/g, '"').trim() ?? "").filter(Boolean);
    if (extracted.length > 0) return extracted.join("\n\n");
  }

  return value;
}

export function AccountDraftStudio({
  locale,
  account,
  drafts,
  generateDraftsAction,
  saveKeywordsAction,
  scheduleBulkAction,
  scheduleSingleAction,
}: AccountDraftStudioProps) {
  const t = COPY[locale];

  // Editable Keywords state
  const initialKeywords = [0, 1, 2].map((i) => account.keywords[i]?.keyword ?? "");
  const [isEditingKeywords, setIsEditingKeywords] = useState(false);

  // Draft selection state
  const [selectedDrafts, setSelectedDrafts] = useState<Set<string>>(new Set());

  const handleSelectDraft = (id: string) => {
    setSelectedDrafts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Schedule Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [intervalHours, setIntervalHours] = useState(2);
  const [manualTimes, setManualTimes] = useState<Record<string, string>>({}); // draftId -> time string

  const authorName = account.username ? `@${account.username}` : account.display_name || "Threads";
  const authorInitials = (account.username || account.display_name || "T")[0].toUpperCase();

  // Helper to re-calculate schedule times
  const selectedDraftsList = drafts.filter(d => selectedDrafts.has(d.id));
  
  const activeKeywords = initialKeywords.filter(Boolean);

  // Input Mode state
  const [inputMode, setInputMode] = useState<"ai" | "manual">("ai");
  const [manualText, setManualText] = useState("");

  return (
    <div className="mb-16">
      {/* HEADER: Profile & Keywords */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-6 mb-6">
        <div className="flex items-center gap-3">
           <div className="relative">
             <div className="w-12 h-12 rounded-full border border-slate-200 bg-white shadow-sm flex items-center justify-center text-xl font-bold text-slate-900 z-10 relative">
               {authorInitials}
             </div>
             <div className="absolute -bottom-1 -right-1 z-20 bg-white rounded-full p-[2px] shadow-sm">
               {account.platform === 'threads' ? (
                 <span className="w-4 h-4 bg-slate-900 text-white rounded-full flex items-center justify-center text-[9px] font-bold">@</span>
               ) : (
                 <span className="w-4 h-4 bg-blue-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold">X</span>
               )}
             </div>
           </div>
           <div>
             <h2 className="text-lg font-bold text-slate-900 inline-flex items-center gap-2">
               {authorName}
             </h2>
             <p className="text-xs text-slate-500 capitalize">{account.account_status}</p>
           </div>
        </div>

        <div className="h-4 w-px bg-slate-200 hidden sm:block" />

        <div className="flex-1">
          {!isEditingKeywords ? (
             <div className="flex items-center gap-2 flex-wrap cursor-pointer group" onClick={() => setIsEditingKeywords(true)}>
               {activeKeywords.length > 0 ? activeKeywords.map((kw, i) => (
                 <span key={i} className="px-3 py-1 bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold rounded-md group-hover:border-slate-300 transition-colors">
                   {kw}
                 </span>
               )) : (
                 <span className="text-sm text-slate-400 border border-dashed border-slate-300 px-4 py-1.5 rounded-md hover:bg-slate-50 transition-colors">
                   + Add keywords
                 </span>
               )}
             </div>
          ) : (
             <form action={async (fd) => {
               await saveKeywordsAction(fd);
               setIsEditingKeywords(false);
             }} className="flex items-center gap-2 flex-wrap">
               <input type="hidden" name="connectedAccountId" value={account.id} />
               {[0, 1, 2].map((i) => (
                 <input 
                   key={i} 
                   name={`keyword${i + 1}`} 
                   defaultValue={initialKeywords[i]} 
                   placeholder={t.keywordPlaceholder}
                   className="w-24 sm:w-32 px-3 py-1 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-slate-500"
                 />
               ))}
               <button type="submit" className="px-3 py-1 bg-slate-900 text-white text-xs font-semibold rounded-md hover:bg-slate-800">
                 {t.saveKeywords}
               </button>
               <button type="button" onClick={() => setIsEditingKeywords(false)} className="p-1 text-slate-400 hover:text-slate-600">
                 <X className="w-4 h-4" />
               </button>
             </form>
          )}
        </div>
      </div>

      {/* MAIN SPLIT VIEW */}
      <div className="flex flex-col xl:flex-row gap-12 items-start mt-8">
        
        {/* LEFT: Input Form */}
        <div className="flex-1 w-full max-w-[600px] mt-4">
           {/* Toggle */}
           <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full w-max mb-6 relative z-50">
             <div 
               onClick={() => setInputMode('ai')} 
               className={`cursor-pointer px-4 py-1.5 rounded-full text-xs font-bold transition-all select-none ${inputMode === 'ai' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
               {t.aiCustomization}
             </div>
             <div 
               onClick={() => setInputMode('manual')} 
               className={`cursor-pointer px-4 py-1.5 rounded-full text-xs font-bold transition-all select-none ${inputMode === 'manual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
             >
               {t.manualWrite}
             </div>
           </div>

           {inputMode === 'ai' ? (
             <form action={generateDraftsAction}>
               <input type="hidden" name="connectedAccountId" value={account.id} />
               <input type="hidden" name="keyword1" value={initialKeywords[0]} />
               <input type="hidden" name="keyword2" value={initialKeywords[1]} />
               <input type="hidden" name="keyword3" value={initialKeywords[2]} />

               <div className="flex flex-col divide-y divide-slate-100">
                  <div className="py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                    <span className="text-sm font-semibold text-slate-500 min-w-[100px]">{t.countLabel}</span>
                    <select
                      name="draftCount"
                      defaultValue="5"
                      className="bg-transparent text-2xl font-bold text-slate-900 outline-none cursor-pointer"
                    >
                      {[1, 3, 5, 10, 20].map((count) => (
                        <option key={count} value={count}>{count}</option>
                      ))}
                    </select>
                  </div>

                  <div className="py-6 flex flex-col gap-2">
                    <textarea
                      name="customization"
                      rows={4}
                      placeholder={t.placeholder}
                      className="w-full resize-none bg-transparent text-lg text-slate-900 placeholder:text-slate-300 outline-none"
                    />
                  </div>

                  <div className="py-6 flex items-center gap-3">
                    <SubmitButton idle={t.generate} pending={t.generating} icon={Bot} />
                  </div>
               </div>
             </form>
           ) : (
             <form action={scheduleSingleAction}>
                <input type="hidden" name="connectedAccountId" value={account.id} />
                <input type="hidden" name="timezone" id={`timezone-${account.id}`} />
                <script dangerouslySetInnerHTML={{ __html: `document.getElementById('timezone-${account.id}').value = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';` }} />

                <div className="flex flex-col divide-y divide-slate-100">
                  <div className="py-6 flex flex-col gap-2">
                    <textarea 
                      name="postText" 
                      value={manualText}
                      onChange={e => setManualText(e.target.value)}
                      placeholder="Write your post here to see a live preview..." 
                      className="w-full min-h-[160px] resize-y bg-transparent text-lg text-slate-900 placeholder:text-slate-300 outline-none"
                      required
                    />
                  </div>

                  <div className="py-6 flex items-center gap-3">
                     <SubmitButton idle="Schedule Post" pending="Scheduling..." icon={Send} />
                     <input type="datetime-local" name="scheduledFor" required className="px-5 py-2.5 border border-slate-200 bg-slate-50 rounded-full text-sm font-semibold focus:outline-none focus:border-slate-400" />
                  </div>
                </div>
             </form>
           )}
        </div>

        {/* RIGHT: Preview Frame */}
        <div className="w-full xl:w-[420px] shrink-0 flex flex-col items-center">
            <div className="relative w-full h-[780px] bg-[#fbfbfb] rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
               
               {/* Frame Header */}
               <div className="pt-10 pb-3 px-5 border-b border-slate-200/60 bg-white flex justify-between items-center z-10 shadow-sm">
                  <span className="font-bold text-lg tracking-tight">Drafts</span>
                  {selectedDrafts.size > 0 && (
                    <button 
                      onClick={() => setIsModalOpen(true)}
                      className="px-3 py-1.5 bg-slate-900 text-white rounded-full text-xs font-bold animate-in fade-in zoom-in duration-200"
                    >
                      {selectedDrafts.size}{t.scheduleN}
                    </button>
                  )}
               </div>

               {/* Drafts / Preview Inside */}
               <div className="flex-1 overflow-y-auto bg-white relative hide-scrollbar min-h-[300px]">
                  {inputMode === 'manual' ? (
                    // Live Preview for Manual Mode
                    <div className="px-5 py-4 border-b border-slate-100 relative">
                         <div className="flex gap-3">
                           <div className="flex flex-col items-center">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              {(account as any).profile_picture_url ? (
                                 <img src={(account as any).profile_picture_url} className="w-10 h-10 rounded-full object-cover shrink-0" alt="" />
                              ) : (
                                 <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                   {authorInitials}
                                 </div>
                              )}
                              <div className="w-[1.5px] min-h-[30px] bg-slate-200 mt-2 rounded-full flex-1" />
                           </div>

                           <div className="flex-1 min-w-0 pt-0.5">
                              <div className="flex items-center gap-1.5 truncate pr-2 mb-1">
                                <span className="font-bold text-[15px] text-slate-900">
                                  {account.username || account.display_name}
                                </span>
                                <span className="text-[14px] text-slate-500 truncate">
                                  · {account.display_name}
                                </span>
                              </div>
                              <div className="w-full text-[15px] leading-relaxed text-slate-900 break-words mb-3 whitespace-pre-wrap min-h-[40px]">
                                {manualText || <span className="text-slate-300">Type something to see preview...</span>}
                              </div>
                              <div className="flex items-center gap-4 text-slate-500 mb-1">
                                <Heart className="w-5 h-5" strokeWidth={2} />
                                <MessageCircle className="w-5 h-5" strokeWidth={2} />
                                <Repeat className="w-5 h-5" strokeWidth={2} />
                                <Send className="w-5 h-5" strokeWidth={2} />
                              </div>
                           </div>
                         </div>
                    </div>
                  ) : (
                    // Generated Drafts for AI Mode
                    <>
                      {drafts.length === 0 && (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm space-y-2 mt-10">
                          <Bot className="w-8 h-8 opacity-20" />
                          <p>No drafts yet.</p>
                        </div>
                      )}

                      {drafts.map((draft) => {
                        const isSelected = selectedDrafts.has(draft.id);
                        return (
                          <div 
                            key={draft.id} 
                            className={`px-5 py-4 relative cursor-pointer transition-colors border-b border-slate-100 last:border-0 ${isSelected ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
                            onClick={() => handleSelectDraft(draft.id)}
                          >
                            <div className="flex gap-3">
                              <div className="flex flex-col items-center">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  {(account as any).profile_picture_url ? (
                                     <img src={(account as any).profile_picture_url} className="w-10 h-10 rounded-full object-cover shrink-0" alt="" />
                                  ) : (
                                     <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white font-bold text-sm shrink-0">
                                       {authorInitials}
                                     </div>
                                  )}
                                  <div className="w-[1.5px] min-h-[30px] bg-slate-200 mt-2 rounded-full flex-1" />
                              </div>

                              <div className="flex-1 min-w-0 pt-0.5">
                                  <div className="flex items-center justify-between mb-1">
                                     <div className="flex items-center gap-1.5 truncate pr-2">
                                       <span className="font-bold text-[15px] text-slate-900">
                                         {account.username || account.display_name}
                                       </span>
                                       <span className="text-[14px] text-slate-500 truncate">
                                         · {account.display_name}
                                       </span>
                                     </div>
                                     
                                     {/* Check Button Area */}
                                     <button 
                                        type="button"
                                        className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors shrink-0
                                            ${isSelected ? 'bg-slate-900 border-slate-900' : 'border-slate-300 bg-white'}`}
                                     >
                                         {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                     </button>
                                  </div>
                                  
                                  <div className="text-[15px] leading-relaxed text-slate-900 break-words mb-3 whitespace-pre-wrap min-h-[40px]">
                                    {formatDraftText(draft.output_text)}
                                  </div>

                                  <div className="flex items-center gap-4 text-slate-500 mb-1">
                                    <Heart className="w-5 h-5" strokeWidth={2} />
                                    <MessageCircle className="w-5 h-5" strokeWidth={2} />
                                    <Repeat className="w-5 h-5" strokeWidth={2} />
                                    <Send className="w-5 h-5" strokeWidth={2} />
                                  </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
               </div>
            </div>
        </div>

      </div>

      {/* SCHEDULE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
             
             <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
               <h3 className="text-xl font-bold text-slate-900">{t.scheduleModalTitle}</h3>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 rounded-full p-1 bg-slate-50">
                 <X className="w-5 h-5" />
               </button>
             </div>

             <div className="p-6">
                <div className="grid grid-cols-2 gap-4 mb-6">
                   <div>
                     <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">{t.startTime}</label>
                     <input 
                       type="datetime-local" 
                       value={startDate}
                       onChange={(e) => setStartDate(e.target.value)}
                       className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-slate-400"
                     />
                   </div>
                   <div>
                     <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">{t.intervalHr}</label>
                     <input 
                       type="number" 
                       value={intervalHours}
                       onChange={(e) => setIntervalHours(Number(e.target.value))}
                       min={1}
                       className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:border-slate-400"
                     />
                   </div>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 max-h-[300px] overflow-y-auto space-y-3 border border-slate-100">
                  {selectedDraftsList.map((draft, idx) => {
                    // Calculate auto-scheduled time
                    let calculatedTime = "";
                    if (startDate) {
                       const d = new Date(startDate);
                       d.setHours(d.getHours() + (idx * intervalHours));
                       calculatedTime = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
                    }
                    const finalTime = manualTimes[draft.id] || calculatedTime;

                    return (
                      <div key={draft.id} className="flex flex-col sm:flex-row sm:items-center gap-3 bg-white p-3 rounded-xl border border-slate-200">
                         <div className="flex-1 w-full max-w-full">
                           <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Draft {idx + 1}</p>
                           <p className="text-sm text-slate-700 truncate pr-4">{formatDraftText(draft.output_text)}</p>
                         </div>
                         <input 
                           type="datetime-local" 
                           value={finalTime}
                           onChange={(e) => setManualTimes(prev => ({...prev, [draft.id]: e.target.value}))}
                           className="w-[180px] shrink-0 font-medium text-slate-900 bg-transparent border-b border-dashed border-slate-300 pb-1 focus:outline-none focus:border-slate-600 text-sm"
                         />
                      </div>
                    );
                  })}
                </div>

                <form action={async (fd) => {
                  // Reconstruct the array of {text, time}
                  const start = new Date(startDate);
                  const payload = selectedDraftsList.map((draft, idx) => {
                     const d = new Date(start);
                     d.setHours(d.getHours() + (idx * intervalHours));
                     const autoTime = d.toISOString();
                     
                     // If user modified manually, manualTimes will have a 'YYYY-MM-DDTHH:MM' string
                     const finalTimeString = manualTimes[draft.id] ? new Date(manualTimes[draft.id]).toISOString() : autoTime;

                     return {
                       text: formatDraftText(draft.output_text),
                       time: finalTimeString
                     };
                  });

                  fd.append("connectedAccountId", account.id);
                  fd.append("posts", JSON.stringify(payload));
                  
                  await scheduleBulkAction(fd);
                  setIsModalOpen(false);
                  setSelectedDrafts(new Set());
                }}>
                  <SubmitButton idle={t.confirmSchedule} pending="Loading..." icon={CalendarClock} />
                </form>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
