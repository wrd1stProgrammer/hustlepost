import { redirect } from "next/navigation";
import { ensureProfile, listConnectedAccountsWithKeywords } from "@/lib/db/accounts";
import { createWorkspaceAction } from "@/app/dashboard/actions";
import {
  deriveWorkspaceKeywordsFromAccounts,
  getWorkspaceState,
} from "@/lib/dashboard/workspaces";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await ensureProfile(user);

  const accounts = await listConnectedAccountsWithKeywords(user.id);
  const threadAccounts = accounts.filter((account) => account.platform === "threads");
  const workspaceState = await getWorkspaceState({
    userId: user.id,
    fallbackKeywords: deriveWorkspaceKeywordsFromAccounts(threadAccounts),
  });

  if (workspaceState.workspaces.length > 0) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#f4f6fa] px-6 py-10 text-slate-900 lg:px-10">
      <div className="mx-auto flex max-w-[1180px] flex-col gap-8 lg:gap-10">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
            Workspace onboarding
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            Create your first workspace
          </h1>
          <p className="mt-4 text-base leading-8 text-slate-600">
            Workspaces now own your draft-generation rules. Set three keywords, define the
            audience and product context, and give the three draft types their own angle before
            you land in the posting dashboard.
          </p>
        </div>

        {threadAccounts.length === 0 ? (
          <div className="rounded-[32px] border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-2xl font-semibold text-slate-950">1. Connect a Threads account</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Before a workspace can publish anything, you need at least one Threads account
              connected. After the connection succeeds, you will return here and finish the
              workspace setup.
            </p>
            <a
              href="/api/oauth/threads?redirectTo=/onboarding"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white"
            >
              Connect Threads
            </a>
          </div>
        ) : (
          <div className="grid gap-8 xl:grid-cols-[340px_minmax(0,1fr)]">
            <section className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-950">Connected accounts</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Publishing later will target whichever accounts you select in the dashboard.
                Workspace setup itself is account-agnostic.
              </p>

              <div className="mt-6 space-y-3">
                {threadAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      @{account.username ?? account.display_name ?? "threads-account"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {account.display_name ?? "Threads account"}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-sm">
              <h2 className="text-2xl font-semibold text-slate-950">2. Define the workspace</h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                These settings drive AI generation for every draft in the workspace.
              </p>

              <form action={createWorkspaceAction} className="mt-8 space-y-7">
                <input type="hidden" name="redirectTo" value="/dashboard" />

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-800">Workspace name</span>
                    <input
                      name="workspaceName"
                      placeholder="e.g. diet-helper"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-800">Target audience</span>
                    <input
                      name="targetAudience"
                      placeholder="e.g. office workers in their 20s and 30s who want easier wellness habits"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                    />
                  </label>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-800">Three keywords</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[1, 2, 3].map((slot) => (
                      <input
                        key={slot}
                        name={`keyword${slot}`}
                        placeholder="e.g. wellness"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                      />
                    ))}
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-800">Product link</span>
                    <input
                      name="productLink"
                      placeholder="e.g. https://example.com/product"
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-slate-400"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-800">Common instruction</span>
                    <textarea
                      name="commonInstruction"
                      placeholder="e.g. Keep the tone calm, useful, and specific. Avoid sounding salesy."
                      className="min-h-[110px] w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-900 outline-none focus:border-slate-400"
                    />
                  </label>
                </div>

                <div className="space-y-4">
                  <p className="text-sm font-semibold text-slate-800">Three type-specific points</p>
                  <div className="grid gap-4 lg:grid-cols-3">
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Informational</span>
                      <textarea
                        name="informationalFocus"
                        placeholder="e.g. Prioritize facts, clarity, and useful takeaways."
                        className="min-h-[150px] w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-900 outline-none focus:border-slate-400"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Engagement</span>
                      <textarea
                        name="engagementFocus"
                        placeholder="e.g. End with a question or a take that invites replies."
                        className="min-h-[150px] w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-900 outline-none focus:border-slate-400"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-medium text-slate-700">Product-led</span>
                      <textarea
                        name="productFocus"
                        placeholder="e.g. Tie the product into the problem-solution flow without hard selling."
                        className="min-h-[150px] w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-900 outline-none focus:border-slate-400"
                      />
                    </label>
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white"
                  >
                    Finish onboarding
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
