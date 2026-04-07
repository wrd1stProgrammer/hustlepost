import { redirect } from "next/navigation";

export default function DashboardSettingsPlansRedirect() {
  redirect("/dashboard/settings?tab=plans");
}
