import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { Folder, Link2, Plus, Sparkles, Target } from "lucide-react";
import { listConnectedAccountsWithKeywords } from "@/lib/db/accounts";
import { getDashboardCopy } from "@/lib/i18n/dashboard";
import { getRequestLocale } from "@/lib/i18n/request";
import {
  createWorkspaceAction,
  saveWorkspaceSettingsAction,
  selectWorkspaceAction,
} from "../actions";
import {
  deriveWorkspaceKeywordsFromAccounts,
  getWorkspaceState,
} from "@/lib/dashboard/workspaces";

export default async function DashboardWorkspacesPage({
  searchParams,
}: {
  searchParams: Promise<{
    lang?: string;
    workspace_created?: string;
    workspace_saved?: string;
    workspace?: string;
    create?: string;
  }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const locale = await getRequestLocale(params.lang);
  const copy = getDashboardCopy(locale).pages.workspaces;
  const accounts = await listConnectedAccountsWithKeywords(user.id);
  const threadAccounts = accounts.filter((account) => account.platform === "threads");

  const workspaceState = await getWorkspaceState({
    userId: user.id,
    fallbackKeywords: deriveWorkspaceKeywordsFromAccounts(threadAccounts),
  });

  const isEditing = Boolean(params.workspace);
  const isCreateMode = !isEditing && params.create === "1";
  const selectedWorkspace = isEditing
    ? workspaceState.workspaces.find((workspace) => workspace.id === params.workspace)
    : undefined;

  if (isEditing && !selectedWorkspace) {
    redirect("/dashboard/workspaces");
  }

  if (!isEditing && !isCreateMode && workspaceState.workspaces.length === 0) {
    redirect("/onboarding");
  }

  if (isEditing || isCreateMode) {
    const workspace = selectedWorkspace;
    const isExistingWorkspace = Boolean(workspace);

    return (
      <div className="mx-auto min-h-full max-w-4xl px-8 py-8 lg:px-10">
        <Link
          href="/dashboard/workspaces"
          className="mb-6 inline-flex items-center gap-2 text-[14px] font-semibold text-slate-500 transition hover:text-slate-800"
        >
          ← {copy.backToAllWorkspaces}
        </Link>

        {isExistingWorkspace && params.workspace_saved === "1" ? (
          <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-[14px] font-bold text-emerald-700">
            {copy.saved}
          </div>
        ) : null}

        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                {workspace?.name ?? copy.createEditorTitle}
              </h1>
              {workspace?.id === workspaceState.activeWorkspaceId ? (
                <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#20c997]">
                  {copy.activeNow}
                </span>
              ) : null}
            </div>
            <p className="mt-2 text-[15px] font-medium text-slate-500">
              {workspace ? copy.editorDescription : copy.createEditorDescription}
            </p>
          </div>
          {workspace && workspace.id !== workspaceState.activeWorkspaceId ? (
            <form action={selectWorkspaceAction}>
              <input type="hidden" name="workspaceId" value={workspace.id} />
              <input
                type="hidden"
                name="redirectTo"
                value={`/dashboard/workspaces?workspace=${workspace.id}`}
              />
              <button
                type="submit"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-[13px] font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                {copy.setCurrent}
              </button>
            </form>
          ) : null}
        </div>

        <form
          action={workspace ? saveWorkspaceSettingsAction : createWorkspaceAction}
          className="space-y-6"
        >
          {workspace ? <input type="hidden" name="workspaceId" value={workspace.id} /> : null}
          <input
            type="hidden"
            name="redirectTo"
            value={workspace ? `/dashboard/workspaces?workspace=${workspace.id}` : "/dashboard/workspaces"}
          />

          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h3 className="mb-5 flex items-center gap-2 text-[14px] font-bold text-[#1e2330]">
              <Folder className="h-4 w-4 text-slate-400" /> {copy.basics}
            </h3>
            <div className="grid gap-6 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-[13px] font-semibold text-slate-700">
                  {copy.workspaceName}
                </span>
                <input
                  name="workspaceName"
                  defaultValue={workspace?.name ?? ""}
                  placeholder={copy.placeholderWorkspace}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-[14px] text-slate-900 outline-none transition focus:border-[#20c997] focus:bg-white focus:ring-1 focus:ring-[#20c997]"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[13px] font-semibold text-slate-700">
                  {copy.targetAudience}
                </span>
                <input
                  name="targetAudience"
                  defaultValue={workspace?.customization.targetAudience ?? ""}
                  placeholder={copy.placeholderTargetAudience}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-[14px] text-slate-900 outline-none transition focus:border-[#20c997] focus:bg-white focus:ring-1 focus:ring-[#20c997]"
                />
              </label>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h3 className="mb-5 flex items-center gap-2 text-[14px] font-bold text-[#1e2330]">
              <Sparkles className="h-4 w-4 text-slate-400" /> {copy.strategy}
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <span className="text-[13px] font-semibold text-slate-700">{copy.keywords}</span>
                <div className="grid gap-3 md:grid-cols-3">
                  {[1, 2, 3].map((slot) => (
                    <input
                      key={slot}
                      name={`keyword${slot}`}
                      defaultValue={workspace?.keywords[slot - 1] ?? ""}
                      placeholder={copy.placeholderKeyword}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-[14px] text-slate-900 outline-none transition focus:border-[#20c997] focus:bg-white focus:ring-1 focus:ring-[#20c997]"
                    />
                  ))}
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <label className="space-y-2">
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-700">
                    <Link2 className="h-3.5 w-3.5" /> {copy.productLink}
                  </span>
                  <input
                    name="productLink"
                    defaultValue={workspace?.customization.productLink ?? ""}
                    placeholder={copy.placeholderProductLink}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-[14px] text-slate-900 outline-none transition focus:border-[#20c997] focus:bg-white focus:ring-1 focus:ring-[#20c997]"
                  />
                </label>
                <label className="space-y-2">
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold text-slate-700">
                    <Target className="h-3.5 w-3.5" /> {copy.commonInstruction}
                  </span>
                  <textarea
                    name="commonInstruction"
                    defaultValue={workspace?.customization.commonInstruction ?? ""}
                    placeholder={copy.placeholderCommonInstruction}
                    className="min-h-[140px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-[14px] text-slate-900 outline-none transition focus:border-[#20c997] focus:bg-white focus:ring-1 focus:ring-[#20c997]"
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <h3 className="mb-5 text-[14px] font-bold text-[#1e2330]">{copy.typePoints}</h3>
            <div className="grid gap-6 md:grid-cols-3">
              <label className="space-y-2">
                <span className="text-[13px] font-semibold text-slate-700">
                  {copy.informationalFocus}
                </span>
                <textarea
                  name="informationalFocus"
                  defaultValue={workspace?.customization.informationalFocus ?? ""}
                  placeholder={copy.placeholderInfo}
                  className="min-h-[160px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-[14px] text-slate-900 outline-none transition focus:border-[#20c997] focus:bg-white focus:ring-1 focus:ring-[#20c997]"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[13px] font-semibold text-slate-700">
                  {copy.engagementFocus}
                </span>
                <textarea
                  name="engagementFocus"
                  defaultValue={workspace?.customization.engagementFocus ?? ""}
                  placeholder={copy.placeholderEngagement}
                  className="min-h-[160px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-[14px] text-slate-900 outline-none transition focus:border-[#20c997] focus:bg-white focus:ring-1 focus:ring-[#20c997]"
                />
              </label>
              <label className="space-y-2">
                <span className="text-[13px] font-semibold text-slate-700">{copy.productFocus}</span>
                <textarea
                  name="productFocus"
                  defaultValue={workspace?.customization.productFocus ?? ""}
                  placeholder={copy.placeholderProduct}
                  className="min-h-[160px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-[14px] text-slate-900 outline-none transition focus:border-[#20c997] focus:bg-white focus:ring-1 focus:ring-[#20c997]"
                />
              </label>
            </div>
          </div>

          <div className="mt-4 flex justify-end px-2 pb-12">
            <button
              type="submit"
              className="rounded-xl bg-[#20c997] px-6 py-3.5 text-[14px] font-bold text-white shadow-sm transition hover:bg-emerald-400"
            >
              {workspace ? copy.save : copy.createAndSave}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-full max-w-[1600px] px-8 py-8 lg:px-10">
      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{copy.title}</h1>
          <p className="mt-2 text-[15px] font-medium text-slate-500">{copy.description}</p>
        </div>
        <Link
          href="/dashboard/workspaces?create=1"
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#65C984] px-5 py-2.5 text-[14px] font-bold text-[#11301F] shadow-sm transition hover:-translate-y-0.5 hover:bg-[#58B975]"
        >
          <Plus className="h-4 w-4" strokeWidth={3} />
          {copy.createWorkspace}
        </Link>
      </div>

      {params.workspace_created === "1" ? (
        <div className="mb-8 rounded-2xl border border-emerald-100 bg-emerald-50 px-5 py-4 text-[14px] font-bold text-emerald-700">
          {copy.created}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6 pb-12 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {workspaceState.workspaces.map((workspace) => {
          const isCurrent = workspace.id === workspaceState.activeWorkspaceId;
          return (
            <Link
              key={workspace.id}
              href={`/dashboard/workspaces?workspace=${workspace.id}`}
              className={`group relative flex h-[180px] flex-col justify-between rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md ${
                isCurrent ? "border-transparent ring-2 ring-[#20c997]" : "hover:border-slate-300"
              }`}
            >
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-[16px] transition-colors ${
                      isCurrent
                        ? "bg-emerald-50 text-[#20c997]"
                        : "bg-slate-50 text-slate-400 group-hover:bg-slate-100 group-hover:text-slate-600"
                    }`}
                  >
                    <Folder
                      className="h-6 w-6"
                      fill="currentColor"
                      fillOpacity={isCurrent ? 0.2 : 0}
                    />
                  </div>
                  {isCurrent ? (
                    <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-[#20c997]">
                      {copy.currentBadge}
                    </span>
                  ) : null}
                </div>
                <h3 className="line-clamp-1 text-lg font-bold text-slate-900">{workspace.name}</h3>
                <p className="mt-1.5 line-clamp-1 text-[13px] font-medium text-slate-500">
                  {workspace.keywords.filter(Boolean).join(" · ") || copy.noKeywords}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
