import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, CreditCard, ReceiptText } from "lucide-react";
import { ensureProfile, listConnectedAccountsWithKeywords } from "@/lib/db/accounts";
import { listScheduledPosts } from "@/lib/db/publishing";
import { getDashboardCopy } from "@/lib/i18n/dashboard";
import { getRequestLocale } from "@/lib/i18n/request";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import {
  deriveWorkspaceKeywordsFromAccounts,
  getActiveWorkspace,
  getWorkspaceState,
} from "@/lib/dashboard/workspaces";
import { QueueScheduleEditor } from "@/components/queue-schedule-editor";
import {
  getDefaultQueueSettings,
  getQueueSettingsForWorkspace,
  saveQueueSettingsAction,
} from "../queue-actions";
import {
  sendResetPasswordLinkAction,
  signOutAllDevicesAction,
  updateEmailAddressAction,
  updateEmailPreferencesAction,
  updatePasswordAction,
  updateProfileDisplayNameAction,
} from "./actions";

type SettingsTab = "settings" | "queue" | "billing" | "plans";
type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type SettingsProfileState = {
  displayName: string;
  email: string;
  plan: string;
  automationEmailsEnabled: boolean;
  postFailureAlertsEnabled: boolean;
};

function isMissingEmailPreferenceColumns(error: { message?: string } | null) {
  return Boolean(
    error?.message?.includes("automation_emails_enabled") ||
      error?.message?.includes("post_failure_alert_emails_enabled"),
  );
}

function getDisplayNameFallback(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}) {
  const fromDisplayName = user.user_metadata?.display_name;
  if (typeof fromDisplayName === "string" && fromDisplayName.trim()) {
    return fromDisplayName.trim();
  }

  const fromName = user.user_metadata?.name;
  if (typeof fromName === "string" && fromName.trim()) {
    return fromName.trim();
  }

  if (typeof user.email === "string" && user.email.includes("@")) {
    return user.email.split("@")[0] ?? "User";
  }

  return "User";
}

async function getSettingsProfileState(
  supabase: SupabaseServerClient,
  user: {
    id: string;
    email?: string | null;
    user_metadata?: Record<string, unknown> | null;
  },
): Promise<SettingsProfileState> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "display_name, email, plan, automation_emails_enabled, post_failure_alert_emails_enabled",
    )
    .eq("id", user.id)
    .single();

  if (isMissingEmailPreferenceColumns(error)) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("profiles")
      .select("display_name, email, plan")
      .eq("id", user.id)
      .single();

    if (fallbackError) {
      throw fallbackError;
    }

    return {
      displayName:
        (fallbackData?.display_name as string | null) ?? getDisplayNameFallback(user),
      email:
        (fallbackData?.email as string | null) ??
        user.email ??
        "",
      plan: (fallbackData?.plan as string | null) ?? "free",
      automationEmailsEnabled: true,
      postFailureAlertsEnabled: false,
    };
  }

  if (error) {
    throw error;
  }

  return {
    displayName:
      (data?.display_name as string | null) ?? getDisplayNameFallback(user),
    email: (data?.email as string | null) ?? user.email ?? "",
    plan: (data?.plan as string | null) ?? "free",
    automationEmailsEnabled: Boolean(data?.automation_emails_enabled ?? true),
    postFailureAlertsEnabled: Boolean(
      data?.post_failure_alert_emails_enabled ?? false,
    ),
  };
}

function getInitials(name: string) {
  const token = name.trim();
  if (!token) return "U";
  if (token.length === 1) return token.toUpperCase();
  return token.slice(0, 2).toUpperCase();
}

function appendQuery(searchParams: Record<string, string | undefined>, tab: SettingsTab) {
  const params = new URLSearchParams();

  if (searchParams.lang) params.set("lang", searchParams.lang);
  if (searchParams.workspace) params.set("workspace", searchParams.workspace);
  params.set("tab", tab);

  return `/dashboard/settings?${params.toString()}`;
}

export default async function DashboardSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{
    lang?: string;
    tab?: string;
    workspace?: string;
    saved?: string;
    error?: string;
    settings_saved?: string;
    settings_error?: string;
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
  const copy = getDashboardCopy(locale).pages.settings;
  const allAccounts = await listConnectedAccountsWithKeywords(user.id);
  const threadAccounts = allAccounts.filter((account) => account.platform === "threads");
  const activeThreadAccounts = threadAccounts.filter(
    (account) => account.account_status === "active",
  );
  const workspaceState = await getWorkspaceState({
    userId: user.id,
    fallbackKeywords: deriveWorkspaceKeywordsFromAccounts(threadAccounts),
  });
  const activeWorkspace = getActiveWorkspace(workspaceState, params.workspace);

  if (!activeWorkspace) {
    redirect("/onboarding");
  }

  const profileState = await getSettingsProfileState(supabase, user);
  const settingsSavedMessageMap: Record<string, string> = {
    profile_saved: copy.feedback.profileSaved,
    email_requested: copy.feedback.emailRequested,
    password_saved: copy.feedback.passwordSaved,
    reset_sent: copy.feedback.resetSent,
    preferences_saved: copy.feedback.preferencesSaved,
  };
  const settingsErrorMessageMap: Record<string, string> = {
    invalid_display_name: copy.feedback.invalidDisplayName,
    invalid_email: copy.feedback.invalidEmail,
    invalid_password: copy.feedback.invalidPassword,
    profile_failed: copy.feedback.profileFailed,
    email_failed: copy.feedback.emailFailed,
    password_failed: copy.feedback.passwordFailed,
    reset_failed: copy.feedback.resetFailed,
    preferences_failed: copy.feedback.preferencesFailed,
    preferences_unavailable: copy.feedback.preferencesUnavailable,
    signout_failed: copy.feedback.signoutFailed,
  };
  const settingsSavedMessage =
    (params.settings_saved
      ? settingsSavedMessageMap[params.settings_saved]
      : null) ?? null;
  const settingsErrorMessage =
    (params.settings_error
      ? settingsErrorMessageMap[params.settings_error]
      : null) ?? null;

  const workspacePosts = await listScheduledPosts(user.id, {
    workspaceId: activeWorkspace.id,
  });
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const publishedThisMonth = workspacePosts.filter((post) => {
    if (post.status !== "published") return false;
    const stamp = new Date(post.updated_at);
    return !Number.isNaN(stamp.getTime()) && stamp >= monthStart;
  }).length;
  const draftCount = workspacePosts.filter((post) => post.status === "draft").length;

  const activeTab: SettingsTab =
    params.tab === "settings" || params.tab === "billing" || params.tab === "plans"
      ? params.tab
      : "queue";

  const queueSettings = await getQueueSettingsForWorkspace({
    userId: user.id,
    workspaceId: activeWorkspace.id,
  });
  const resolvedQueueSettings = queueSettings ?? getDefaultQueueSettings();
  const queueSettingsKey = JSON.stringify({
    accounts: activeThreadAccounts.map((account) => account.id).sort(),
    timezone: resolvedQueueSettings.timezone,
    sourceMode: resolvedQueueSettings.sourceMode,
    aiType: resolvedQueueSettings.aiType,
    randomizePostingTime: resolvedQueueSettings.randomizePostingTime,
    slots: resolvedQueueSettings.slots
      .map((slot) => ({
        time: slot.time,
        enabled: slot.enabled,
        connectedAccountIds: Array.isArray((slot as { connectedAccountIds?: string[] }).connectedAccountIds)
          ? [...((slot as { connectedAccountIds?: string[] }).connectedAccountIds ?? [])].sort()
          : [],
        sourceMode: slot.sourceMode,
        aiType: slot.aiType,
        days: slot.days,
      }))
      .sort((a, b) => a.time.localeCompare(b.time)),
  });

  const tabHref = (tab: SettingsTab) => appendQuery(params, tab);

  return (
    <div className="relative z-20 mx-auto min-h-full max-w-[1660px] isolate px-7 py-7 lg:px-9 lg:py-8">
      <div className="mb-6">
        <h1 className="text-[28px] font-bold tracking-tight text-[#2f394c]">
          {copy.title}
        </h1>
        <p className="mt-2 max-w-3xl text-[15px] leading-6 text-slate-500">
          {copy.description}
        </p>
      </div>

      <div className="mb-7 flex flex-wrap gap-6 border-b border-slate-200">
        {(
          [
            { key: "settings", label: copy.tabs.settings },
            { key: "queue", label: copy.tabs.queue },
            { key: "billing", label: copy.tabs.billing },
            { key: "plans", label: copy.tabs.plans },
          ] as const
        ).map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Link
              key={tab.key}
              href={tabHref(tab.key)}
              className={`relative pb-4 text-[18px] font-semibold transition ${
                isActive ? "text-[#3ccf7a]" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
              <span
                className={`absolute inset-x-0 bottom-[-1px] h-0.5 rounded-full transition ${
                  isActive ? "bg-[#3ccf7a]" : "bg-transparent"
                }`}
              />
            </Link>
          );
        })}
      </div>

      {params.saved === "1" ? (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-[14px] font-semibold text-emerald-800">
          {copy.queue.saved}
        </div>
      ) : null}

      {params.error === "queue_failed" ? (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-[14px] font-semibold text-rose-700">
          {copy.queue.failed}
        </div>
      ) : null}

      {activeTab === "settings" && settingsSavedMessage ? (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-[14px] font-semibold text-emerald-800">
          {settingsSavedMessage}
        </div>
      ) : null}

      {activeTab === "settings" && settingsErrorMessage ? (
        <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-[14px] font-semibold text-rose-700">
          {settingsErrorMessage}
        </div>
      ) : null}

      {activeTab === "queue" ? (
        <QueueScheduleEditor
          key={`${activeWorkspace.id}:${queueSettingsKey}`}
          copy={copy.queue}
          locale={locale}
          workspaceId={activeWorkspace.id}
          workspaceName={activeWorkspace.name}
          initialSettings={resolvedQueueSettings}
          availableAccounts={activeThreadAccounts.map((account) => ({
            id: account.id,
            platform_user_id: account.platform_user_id,
            username: account.username,
            display_name: account.display_name,
            avatar_url: account.avatar_url ?? null,
          }))}
          saveAction={saveQueueSettingsAction}
          redirectTo={tabHref("queue")}
        />
      ) : activeTab === "settings" ? (
        <div className="space-y-6">
          <section className="rounded-[28px] border border-slate-200 bg-white px-8 py-7 shadow-sm">
            <h2 className="text-[22px] font-semibold tracking-tight text-slate-800">
              {copy.profile.title}
            </h2>
            <div className="mt-6 flex flex-col gap-6 md:flex-row md:items-start">
              <div className="flex h-[92px] w-[92px] shrink-0 items-center justify-center rounded-full bg-violet-500 text-[36px] font-semibold text-white">
                {getInitials(profileState.displayName)}
              </div>
              <div className="w-full max-w-[940px]">
                <form action={updateProfileDisplayNameAction}>
                  <input type="hidden" name="redirectTo" value={tabHref("settings")} />
                  <label className="block text-[15px] font-medium text-slate-500">
                    {copy.profile.displayNameLabel}
                  </label>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <input
                      name="displayName"
                      defaultValue={profileState.displayName}
                      maxLength={60}
                      className="h-12 min-w-[320px] flex-1 rounded-xl border border-slate-300 bg-white px-4 text-[15px] text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-400"
                    />
                    <button
                      type="submit"
                      className="h-12 rounded-xl bg-slate-200 px-7 text-[15px] font-semibold text-slate-700 transition hover:bg-slate-300"
                    >
                      {copy.profile.save}
                    </button>
                  </div>
                </form>
                <p className="mt-2 text-[13px] text-slate-400">
                  {copy.profile.displayNameHint}
                </p>
                <div className="mt-6">
                  <p className="text-[15px] font-medium text-slate-500">
                    {copy.profile.emailLabel}
                  </p>
                  <p className="mt-1 text-[16px] font-medium text-slate-800">
                    {profileState.email}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white px-8 py-7 shadow-sm">
            <h2 className="text-[22px] font-semibold tracking-tight text-slate-800">
              {copy.account.title}
            </h2>
            <div className="mt-3">
              <p className="text-[15px] font-medium text-slate-600">
                {copy.account.currentEmail}
              </p>
              <p className="mt-1 text-[16px] font-medium text-slate-800">
                {profileState.email}
              </p>
            </div>

            <form action={updateEmailAddressAction} className="mt-5 space-y-3">
              <input type="hidden" name="redirectTo" value={tabHref("settings")} />
              <input
                type="email"
                name="nextEmail"
                defaultValue={profileState.email}
                placeholder={copy.account.emailPlaceholder}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-[15px] text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-400"
              />
              <button
                type="submit"
                className="h-12 w-full rounded-xl bg-slate-200 px-6 text-[15px] font-semibold text-slate-700 transition hover:bg-slate-300"
              >
                {copy.account.changeEmail}
              </button>
            </form>

            <div className="mt-7 border-t border-slate-200 pt-6">
              <h3 className="text-[22px] font-semibold tracking-tight text-slate-800">
                {copy.account.passwordTitle}
              </h3>

              <form action={updatePasswordAction} className="mt-4 space-y-3">
                <input type="hidden" name="redirectTo" value={tabHref("settings")} />
                <input
                  type="password"
                  name="nextPassword"
                  placeholder={copy.account.passwordPlaceholder}
                  minLength={8}
                  className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-[15px] text-slate-900 outline-none ring-0 placeholder:text-slate-400 focus:border-slate-400"
                />
                <button
                  type="submit"
                  className="h-12 w-full rounded-xl bg-slate-200 px-6 text-[15px] font-semibold text-slate-700 transition hover:bg-slate-300"
                >
                  {copy.account.changePassword}
                </button>
              </form>

              <form action={sendResetPasswordLinkAction} className="mt-3">
                <input type="hidden" name="redirectTo" value={tabHref("settings")} />
                <button
                  type="submit"
                  className="w-full py-2 text-center text-[15px] font-semibold text-slate-700 transition hover:text-slate-900"
                >
                  {copy.account.sendReset}
                </button>
              </form>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white px-8 py-7 shadow-sm">
            <h2 className="text-[22px] font-semibold tracking-tight text-slate-800">
              {copy.security.title}
            </h2>
            <p className="mt-3 text-[15px] leading-[1.35] text-slate-500">
              {copy.security.description}
            </p>
            <form action={signOutAllDevicesAction} className="mt-5">
              <input type="hidden" name="redirectTo" value={tabHref("settings")} />
              <button
                type="submit"
                className="h-12 w-full rounded-xl bg-slate-200 px-6 text-[15px] font-semibold text-slate-700 transition hover:bg-slate-300"
              >
                {copy.security.signOutAll}
              </button>
            </form>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white px-8 py-7 shadow-sm">
            <h2 className="text-[22px] font-semibold tracking-tight text-slate-800">
              {copy.emailPreferences.title}
            </h2>
            <form action={updateEmailPreferencesAction} className="mt-4">
              <input type="hidden" name="redirectTo" value={tabHref("settings")} />

              <div className="divide-y divide-slate-200">
                <div className="flex items-center justify-between gap-4 py-5">
                  <div>
                    <p className="text-[18px] font-semibold text-slate-800">
                      {copy.emailPreferences.automationTitle}
                    </p>
                    <p className="mt-1 text-[14px] text-slate-500">
                      {copy.emailPreferences.automationDescription}
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      name="automationEmailsEnabled"
                      defaultChecked={profileState.automationEmailsEnabled}
                      className="peer sr-only"
                    />
                    <span className="h-8 w-14 rounded-full border-2 border-slate-400 bg-white transition peer-checked:border-[#51c783] peer-checked:bg-[#eaf9f1]" />
                    <span className="pointer-events-none absolute left-[4px] top-[4px] h-6 w-6 rounded-full bg-slate-400 transition peer-checked:translate-x-6 peer-checked:bg-[#51c783]" />
                  </label>
                </div>

                <div className="flex items-center justify-between gap-4 py-5">
                  <div>
                    <p className="text-[18px] font-semibold text-slate-800">
                      {copy.emailPreferences.failureTitle}
                    </p>
                    <p className="mt-1 text-[14px] text-slate-500">
                      {copy.emailPreferences.failureDescription}
                    </p>
                  </div>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      name="postFailureAlertsEnabled"
                      defaultChecked={profileState.postFailureAlertsEnabled}
                      className="peer sr-only"
                    />
                    <span className="h-8 w-14 rounded-full border-2 border-slate-400 bg-white transition peer-checked:border-[#51c783] peer-checked:bg-[#eaf9f1]" />
                    <span className="pointer-events-none absolute left-[4px] top-[4px] h-6 w-6 rounded-full bg-slate-400 transition peer-checked:translate-x-6 peer-checked:bg-[#51c783]" />
                  </label>
                </div>
              </div>

              <p className="mt-4 text-[12px] text-slate-400">
                {copy.emailPreferences.deliveryNote}
              </p>

              <button
                type="submit"
                className="mt-5 h-12 w-full rounded-xl bg-slate-200 px-6 text-[15px] font-semibold text-slate-700 transition hover:bg-slate-300"
              >
                {copy.emailPreferences.save}
              </button>
            </form>
          </section>
        </div>
      ) : activeTab === "billing" ? (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm md:p-7">
            <div className="mb-5">
              <p className="text-[22px] font-semibold tracking-tight text-slate-900">
                {copy.billing.title}
              </p>
              <p className="mt-2 max-w-3xl text-[14px] leading-6 text-slate-500">
                {copy.billing.description}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between">
                  <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {copy.billing.currentPlanTitle}
                  </p>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                    {copy.billing.planStatus}
                  </span>
                </div>
                <p className="mt-3 text-[22px] font-bold text-slate-900">
                  {copy.billing.planName}
                </p>
                <p className="mt-1 text-[14px] font-medium text-slate-600">
                  {copy.billing.planPrice}
                </p>
                <p className="mt-3 text-[13px] text-slate-500">{copy.billing.comingSoon}</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {copy.billing.usageTitle}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] font-semibold text-slate-500">
                      {copy.billing.usagePosts}
                    </p>
                    <p className="mt-1 text-[22px] font-bold text-slate-900">
                      {publishedThisMonth}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] font-semibold text-slate-500">
                      {copy.billing.usageDrafts}
                    </p>
                    <p className="mt-1 text-[22px] font-bold text-slate-900">{draftCount}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-[13px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {copy.billing.includedTitle}
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {[
                  `${activeThreadAccounts.length} ${copy.billing.includedAccounts}`,
                  `${workspaceState.workspaces.length} ${copy.billing.includedWorkspaces}`,
                  copy.billing.includedQueue,
                ].map((line) => (
                  <div key={line} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-[13px] font-medium text-slate-700">{line}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                  <CreditCard className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-[18px] font-semibold text-slate-900">
                    {copy.billing.paymentTitle}
                  </p>
                  <p className="mt-2 text-[14px] leading-6 text-slate-500">
                    {copy.billing.paymentDescription}
                  </p>
                </div>
              </div>

              <button
                type="button"
                disabled
                className="mt-5 inline-flex w-full cursor-not-allowed items-center justify-center rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3 text-[14px] font-semibold text-slate-500"
              >
                {copy.billing.paymentCta}
              </button>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5">
                  <ReceiptText className="h-5 w-5 text-slate-600" />
                </div>
                <p className="text-[18px] font-semibold text-slate-900">
                  {copy.billing.invoicesTitle}
                </p>
              </div>
              <p className="mt-3 text-[14px] text-slate-500">{copy.billing.invoicesEmpty}</p>
              <p className="mt-1 text-[12px] text-slate-400">{copy.billing.invoicesUpdated}</p>
            </section>
          </div>
        </div>
      ) : (
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm md:p-7">
          <p className="text-[22px] font-semibold tracking-tight text-slate-900">
            {copy.plans.title}
          </p>
          <p className="mt-2 max-w-2xl text-[14px] leading-6 text-slate-500">
            {copy.plans.description}
          </p>
          <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-5 text-[14px] font-semibold text-slate-600">
            {copy.plans.comingSoon}
          </div>
        </div>
      )}
    </div>
  );
}
