"use client";

import { useState, useTransition } from "react";
import { Check } from "lucide-react";
import { saveRoleAction, completeOnboardingAction } from "./actions";

const ROLES = [
  { id: "founder", title: "Founder", desc: "Building a business" },
  { id: "creator", title: "Creator", desc: "Growing an audience" },
  { id: "agency", title: "Agency", desc: "Managing client accounts" },
  { id: "enterprise", title: "Enterprise", desc: "Big company team" },
  { id: "small_biz", title: "Small Business", desc: "Running a small business" },
  { id: "personal", title: "Personal", desc: "Just for me" },
];

export function RoleSelectionForm() {
  const [selectedRole, setSelectedRole] = useState<string>("founder");
  const [pending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(() => {
      const formData = new FormData();
      formData.append("role", selectedRole);
      saveRoleAction(formData);
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-3">
        {ROLES.map((role) => {
          const isActive = selectedRole === role.id;
          return (
            <label
              key={role.id}
              className={`flex cursor-pointer items-center gap-4 rounded-2xl border px-5 py-4 transition-all ${
                isActive
                  ? "border-[#65C984] bg-[#65C984] text-[#11301F] shadow-sm"
                  : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <input
                type="radio"
                name="role"
                value={role.id}
                checked={isActive}
                onChange={() => setSelectedRole(role.id)}
                className="hidden"
              />
              <div
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-all ${
                  isActive
                    ? "border-[#11301F] bg-[#11301F]"
                    : "border-slate-300 bg-white"
                }`}
              >
                {isActive && <Check className="h-3.5 w-3.5 stroke-[3px] text-[#65C984]" />}
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base">{role.title}</span>
                <span className={`text-sm ${isActive ? "text-[#1B4B31]" : "text-slate-500"}`}>
                  {role.desc}
                </span>
              </div>
            </label>
          );
        })}
      </div>

      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[#11301F] px-8 py-3.5 text-sm font-bold text-white transition-all hover:bg-black disabled:opacity-50 sm:w-auto"
        >
          {pending ? "Saving..." : "Continue"}
        </button>
      </div>
    </form>
  );
}

export function PricingDummyStep() {
  const [pending, startTransition] = useTransition();

  const handleComplete = () => {
    startTransition(() => {
      completeOnboardingAction();
    });
  };

  return (
    <div className="space-y-8">
      <div className="grid gap-6 sm:grid-cols-3">
        {["Starter", "Pro", "Agency"].map((plan, i) => (
          <div
            key={plan}
            className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm transition-all hover:border-[#65C984] hover:shadow-md"
          >
            <h3 className="text-xl font-bold text-slate-900">{plan}</h3>
            <p className="text-sm text-slate-500">Dummy tier for onboarding</p>
            <button
              onClick={handleComplete}
              disabled={pending}
              className={`mt-4 w-full rounded-full px-6 py-3 text-sm font-bold transition-all ${
                i === 1
                  ? "bg-[#65C984] text-[#11301F] hover:bg-[#58B975]"
                  : "bg-slate-100 text-slate-900 hover:bg-slate-200"
              }`}
            >
              Select
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
