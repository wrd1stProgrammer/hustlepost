import { redirect } from "next/navigation";
import { ensureProfile, listConnectedAccountsWithKeywords } from "@/lib/db/accounts";
import { createWorkspaceAction } from "@/app/dashboard/actions";
import {
  deriveWorkspaceKeywordsFromAccounts,
  getWorkspaceState,
} from "@/lib/dashboard/workspaces";
import { createSupabaseServerClient } from "@/utils/supabase/server";
import {
  RoleSelectionForm,
  PricingDummyStep,
  WorkspaceCreateSubmitButton,
} from "./components";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
  }>;
}) {
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  await ensureProfile(user);

  // Dynamic state evaluation
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, onboarding_status")
    .eq("id", user.id)
    .single();

  // Redirect completed users strictly back to dashboard to circumvent looping
  if (profile?.onboarding_status === "completed") {
    redirect("/dashboard");
  }

  // Step 1: Role Selection
  if (!profile?.role) {
    return (
      <div className="min-h-screen bg-[#f4f6fa] px-6 py-10 text-slate-900 lg:px-10 flex flex-col items-center justify-center">
        <div className="w-full max-w-md">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500 text-center">
            Welcome to Hustle Post
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 text-center mb-8">
            How will you use Hustle Post?
          </h1>
          <RoleSelectionForm />
        </div>
      </div>
    );
  }

  const accounts = await listConnectedAccountsWithKeywords(user.id);
  const threadAccounts = accounts.filter((account) => account.platform === "threads");
  const workspaceState = await getWorkspaceState({
    userId: user.id,
    fallbackKeywords: deriveWorkspaceKeywordsFromAccounts(threadAccounts),
  });

  // Step 2: Workspace Creation (Required)
  if (workspaceState.workspaces.length === 0) {
    return (
      <div className="min-h-screen bg-[#f4f6fa] px-6 py-10 text-slate-900 lg:px-10">
        <div className="mx-auto flex max-w-[800px] flex-col gap-8 lg:gap-10">
          <div className="">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
              Workspace Setup
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
              Create your first workspace
            </h1>
            <p className="mt-4 text-base leading-8 text-slate-600 max-w-2xl">
              Workspaces isolate your draft-generation rules. Provide three core keywords,
              describe your audience and core product, and define the behavior for each content angle.
            </p>
          </div>

          <section className="rounded-[32px] border border-slate-200 bg-white p-7 sm:p-10 shadow-sm relative">
            {params.error === "workspace_create_failed" ? (
              <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                Workspace creation failed. Please retry once.
              </div>
            ) : null}
            <form action={createWorkspaceAction} className="space-y-7">
              <input type="hidden" name="redirectTo" value="/onboarding" />

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-800">Workspace name</span>
                  <input
                    name="workspaceName"
                    required
                    placeholder="e.g. diet-helper"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#65C984]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-800">Target audience</span>
                  <input
                    name="targetAudience"
                    required
                    placeholder="e.g. office workers in their 20s and 30s"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#65C984]"
                  />
                </label>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-slate-800">Three keywords</span>
                  <span className="text-xs text-slate-500 mt-1">Provide up to three baseline vectors for topics you normally write about.</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[1, 2, 3].map((slot) => (
                    <input
                      key={slot}
                      name={`keyword${slot}`}
                      placeholder={`Keyword ${slot}`}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#65C984]"
                    />
                  ))}
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-800">Product link</span>
                  <input
                    name="productLink"
                    placeholder="https://example.com/product"
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#65C984]"
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-semibold text-slate-800">Common instruction</span>
                  <textarea
                    name="commonInstruction"
                    placeholder="Keep the tone calm, useful, and specific. Avoid sounding salesy."
                    className="min-h-[110px] w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-900 outline-none focus:border-[#65C984]"
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
                      placeholder="Prioritize facts and useful takeaways."
                      className="min-h-[110px] w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-900 outline-none focus:border-[#65C984]"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">Engagement</span>
                    <textarea
                      name="engagementFocus"
                      placeholder="End with a question that invites replies."
                      className="min-h-[110px] w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-900 outline-none focus:border-[#65C984]"
                    />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">Product-led</span>
                    <textarea
                      name="productFocus"
                      placeholder="Tie the product seamlessly without hard push."
                      className="min-h-[110px] w-full rounded-[24px] border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-900 outline-none focus:border-[#65C984]"
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <WorkspaceCreateSubmitButton />
              </div>
            </form>
          </section>
        </div>
      </div>
    );
  }

  // Step 3: Connect Threads
  if (threadAccounts.length === 0) {
    return (
      <div className="min-h-screen bg-[#f4f6fa] px-6 py-10 text-slate-900 lg:px-10 flex flex-col items-center justify-center">
        <div className="w-full max-w-xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500 mb-3">
            Publishing setup
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-950 mb-4">
            Connect a Threads account
          </h1>
          <p className="text-base text-slate-600 mb-10 max-w-md mx-auto">
            To automatically publish posts from your workspace, link at least one Threads destination now. 
            You&apos;ll automatically return here right after successfully providing authorization.
          </p>
          <a
            href="/api/oauth/threads?redirectTo=/onboarding"
            className="inline-flex cursor-pointer items-center justify-center rounded-full border border-[#1e7f52] bg-[#20c997] px-10 py-4 text-base font-bold text-[#0b1d14] transition-all hover:-translate-y-0.5 hover:bg-[#19b986] hover:shadow-[0_10px_24px_-8px_rgba(32,201,151,0.55)]"
          >
            Connect Threads
          </a>
        </div>
      </div>
    );
  }

  // Step 4: Pricing Dummy
  return (
    <div className="min-h-screen bg-[#f4f6fa] px-6 py-10 text-slate-900 lg:px-10 flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500 mb-3">
          Last step
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-slate-950 mb-10">
          Choose a plan
        </h1>
        <PricingDummyStep />
      </div>
    </div>
  );
}
