import { redirect } from "next/navigation";

export default function DashboardSettingsBillingRedirect() {
  redirect("/dashboard/settings?tab=billing");
}
