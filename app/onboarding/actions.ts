"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/utils/supabase/server";

export async function saveRoleAction(formData: FormData) {
  const role = formData.get("role");
  if (!role || typeof role !== "string") return;

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    await supabase.from("profiles").update({ role }).eq("id", user.id);
  }

  redirect("/onboarding");
}

export async function completeOnboardingAction() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    await supabase.from("profiles").update({ onboarding_status: "completed" }).eq("id", user.id);
  }

  redirect("/dashboard");
}
