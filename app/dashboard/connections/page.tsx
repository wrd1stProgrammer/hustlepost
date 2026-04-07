import { redirect } from "next/navigation";
import {
  ensureProfile,
  listConnectedAccounts,
} from "@/lib/db/accounts";
import { getDashboardCopy } from "@/lib/i18n/dashboard";
import { getIntlLocale } from "@/lib/i18n/locales";
import { ConnectedAccountAvatar } from "@/components/connected-account-avatar";
import {
  getConnectedAccountDisplayLabel,
  getConnectedAccountSecondaryLabel,
} from "@/lib/accounts/avatar";
import { getRequestLocale } from "@/lib/i18n/request";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import { disconnectConnectedAccountAction } from "../actions";
import { DashboardToast } from "@/components/dashboard-toast";

export default async function DashboardConnectionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    lang?: string;
    connected?: string;
    disconnected?: string;
    error?: string;
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
  const t = getDashboardCopy(locale).pages.connections;
  const accounts = await listConnectedAccounts(user.id);
  const threadAccounts = accounts.filter((account) => account.platform === "threads");

  const feedback =
    params.connected === "threads"
      ? { type: "success" as const, message: t.connected }
      : params.disconnected === "1"
        ? { type: "success" as const, message: t.disconnected }
        : params.error
          ? { type: "error" as const, message: t.genericError }
          : null;

  return (
    <div className="mx-auto max-w-[1560px] px-8 py-8 lg:px-10 lg:py-10">
      <DashboardToast
        toast={feedback}
        clearKeys={["connected", "disconnected", "error"]}
      />

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-slate-500">{t.eyebrow}</p>
          <h1 className="mt-2 text-[30px] font-bold tracking-tight text-slate-950">
            {t.title}
          </h1>
          <p className="mt-3 text-[15px] leading-7 text-slate-600">
            {t.description}
          </p>
        </div>

        <a
          href="/api/oauth/threads?redirectTo=/dashboard/connections"
          className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {t.connect}
        </a>
      </div>

      {threadAccounts.length === 0 ? (
        <div className="mt-8 rounded-[24px] border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
          {t.noAccounts}
        </div>
      ) : (
        <div className="mt-8 flex flex-col gap-3">
          {threadAccounts.map((account) => (
            <div
              key={account.id}
              className="flex flex-col gap-4 rounded-[20px] border border-slate-200 bg-white p-4 shadow-[0_2px_8px_rgba(15,23,42,0.03)] sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-3.5">
                <ConnectedAccountAvatar
                  account={account}
                  size={42}
                  initialsClassName="text-[15px]"
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-[15px] font-semibold tracking-tight text-slate-950">
                      {getConnectedAccountDisplayLabel(account)}
                    </h2>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                      {t.status[account.account_status as keyof typeof t.status] ??
                        account.account_status}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-[13px] text-slate-500">
                    {getConnectedAccountSecondaryLabel(account)}
                    <span className="mx-1.5 opacity-50">·</span>
                    {t.connectedAt}{" "}
                    {new Intl.DateTimeFormat(getIntlLocale(locale), {
                      dateStyle: "medium",
                    }).format(new Date(account.created_at))}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href="/api/oauth/threads?redirectTo=/dashboard/connections"
                  className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 px-4 text-[13px] font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  {t.reconnect}
                </a>

                <form action={disconnectConnectedAccountAction}>
                  <input type="hidden" name="connectedAccountId" value={account.id} />
                  <input type="hidden" name="redirectTo" value="/dashboard/connections" />
                  <button
                    type="submit"
                    className="inline-flex h-9 cursor-pointer items-center justify-center rounded-xl border border-rose-100 bg-rose-50 px-4 text-[13px] font-semibold text-rose-600 transition hover:border-rose-200 hover:bg-rose-100"
                  >
                    {t.disconnect}
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
