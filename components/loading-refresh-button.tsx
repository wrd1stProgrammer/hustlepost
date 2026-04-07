"use client";

import { useFormStatus } from "react-dom";
import { RefreshCcw, Loader2 } from "lucide-react";

export function LoadingRefreshButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 w-11 cursor-pointer items-center justify-center rounded-[14px] border border-slate-200 bg-slate-50 text-slate-500 transition hover:bg-slate-100 disabled:opacity-50"
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RefreshCcw className="h-4 w-4 transition hover:rotate-180" />
      )}
    </button>
  );
}
