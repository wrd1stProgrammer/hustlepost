import { Loader2 } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex h-[calc(100vh-64px)] w-full items-center justify-center">
      <div className="flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#65C984]" />
      </div>
    </div>
  );
}
