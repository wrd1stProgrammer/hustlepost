import { redirect } from "next/navigation";
import { ensureProfile } from "@/lib/db/accounts";
import { listGeneratedHooks } from "@/lib/db/generated-hooks";
import { getDashboardCopy } from "@/lib/i18n/dashboard";
import { getRequestLocale } from "@/lib/i18n/request";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { Layers3, Settings2, Clock, CheckSquare, Settings, Command } from "lucide-react";

export default async function DashboardBulkToolsPage({
  searchParams,
}: {
  searchParams: Promise<{
    lang?: string;
  }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await ensureProfile(user);
  const params = await searchParams;
  const locale = await getRequestLocale(params.lang);
  const t = getDashboardCopy(locale).pages.bulk;
  const hooks = await listGeneratedHooks(user.id);

  return (
    <div className="mx-auto min-h-full max-w-[1600px] px-4 py-5 sm:p-8 lg:p-12">
      <div className="flex flex-col mb-8">
        <h1 className="flex items-center gap-3 text-[1.75rem] font-semibold tracking-tight text-slate-900 sm:text-3xl">
          <Layers3 className="h-8 w-8 text-slate-900" />
           {t.title}
        </h1>
        <p className="mt-2 text-slate-500 max-w-2xl">{t.subtitle}</p>
      </div>

      <div className="flex flex-col items-start gap-6 sm:gap-8 xl:flex-row">
        {/* Left: Drafts List */}
        <div className="flex-1 w-full max-w-[900px]">
           <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-lg font-semibold text-slate-900">{t.drafts} <span className="text-slate-400 font-normal">({hooks.length > 0 ? hooks.length : 50})</span></h2>
              <button className="flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                <CheckSquare className="h-4 w-4" />
                {t.selectAll}
              </button>
           </div>
           
           <div className="space-y-3">
             {/* Mocking a list of drafts based on user's description (e.g. 50 drafts) */}
             {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-4 p-5 rounded-xl border border-slate-200 bg-white shadow-sm hover:border-slate-300 transition-colors">
                   <div className="pt-1">
                     <div className="w-5 h-5 rounded border-2 border-slate-300 flex items-center justify-center cursor-pointer bg-slate-900 border-slate-900">
                        <CheckSquare className="h-4 w-4 text-white" />
                     </div>
                   </div>
                   <div className="flex-1">
                     <div className="mb-2 flex items-center gap-2">
                       <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-slate-100 text-slate-500">Draft #{i + 1}</span>
                       <span className="text-xs text-slate-400">@ Keyword {i + 1}</span>
                     </div>
                     <textarea 
                       className="w-full text-sm text-slate-700 leading-relaxed resize-none bg-transparent focus:outline-none"
                       rows={3}
                       defaultValue={`This is an auto-generated draft tailored to your configuration based on the keyword ${i+1}. It discusses how automation can scale your reach safely and consistently without human intervention.`}
                     />
                   </div>
                </div>
             ))}
             
             <div className="p-4 text-center text-sm font-medium text-slate-400 border border-dashed border-slate-200 rounded-xl">
               ... 45 more drafts available
             </div>
           </div>
        </div>

        {/* Right: Schedule Configuration Panel */}
        <div className="w-full shrink-0 xl:w-[400px] xl:sticky xl:top-4">
           <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 shadow-sm">
             <div className="flex items-center gap-2 mb-6">
                <Settings2 className="h-5 w-5 text-slate-700" />
                <h2 className="text-[1.1rem] font-semibold text-slate-900">{t.config}</h2>
             </div>

             <div className="space-y-6">
                {/* Interval Setting */}
                <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-2">{t.interval}</label>
                   <div className="flex items-center gap-3">
                      <input type="number" defaultValue={4} className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-center font-medium focus:outline-none focus:ring-2 focus:ring-slate-900/10" />
                      <span className="text-sm text-slate-500">{t.intervalHelper}</span>
                   </div>
                </div>

                <div className="h-px bg-slate-200 w-full" />

                {/* Exclusion Setting */}
                <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                     <Clock className="h-4 w-4" />
                     {t.exclusion}
                   </label>
                   <div className="space-y-3 mt-4">
                     <div className="flex items-center justify-between">
                       <span className="text-sm text-slate-600">{t.exclusionStart}</span>
                       <input type="time" defaultValue="23:00" className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white" />
                     </div>
                     <div className="flex items-center justify-between">
                       <span className="text-sm text-slate-600">{t.exclusionEnd}</span>
                       <input type="time" defaultValue="06:00" className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white" />
                     </div>
                   </div>
                </div>

                {/* Action Button */}
                <div className="pt-4">
                  <button className="w-full py-3.5 rounded-xl bg-[#4ADE80] text-emerald-950 font-semibold shadow-sm hover:bg-[#34D399] transition-colors flex items-center justify-center gap-2">
                     <Command className="h-4 w-4" />
                     {t.saveQueue} (50)
                  </button>
                </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
